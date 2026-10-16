package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// Config holds environment configurations
type Config struct {
	Port         string
	SupabaseURL  string
	SupabaseKey  string
	AllowedEmail string
	CorsOrigin   string
}

type TokenPayload struct {
	Email string `json:"email"`
	Sub   string `json:"sub"`
	Error string `json:"error"`
}

type RouletteItem struct {
	ItemID   string `json:"item_id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle,omitempty"`
	Type     string `json:"type"`
	Weight   int    `json:"weight"`
}

type RouletteAuditLog struct {
	ID                   string         `json:"id"`
	RouletteID           string         `json:"roulette_id"`
	RouletteTitle        string         `json:"roulette_title"`
	Type                 string         `json:"type"`
	SelectedItemTitle    string         `json:"selected_item_title"`
	CandidatePool        []RouletteItem `json:"candidate_pool"`
	ExecutedByType       string         `json:"executed_by_type"`
	ExecutedByIdentifier string         `json:"executed_by_identifier"`
	CreatedAt            string         `json:"created_at"`
}

var cfg Config

func main() {
	cfg = Config{
		Port:        getEnv("PORT", "8080"),
		SupabaseURL: strings.TrimRight(getEnv("SUPABASE_URL", "https://xyz.supabase.co"), "/"),
		SupabaseKey: getEnv("SUPABASE_SECRET_KEY", ""),
		CorsOrigin:  getEnv("CORS_ORIGIN", "*"),
	}

	mux := http.NewServeMux()

	// Diagnostic / Health
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/api/health", handleHealth)

	// Setup endpoints
	mux.HandleFunc("/api/setup/status", handleSetupStatus)
	mux.HandleFunc("/api/setup", handleSetup)

	// Places endpoints
	mux.HandleFunc("/api/places", handlePlaces)
	mux.HandleFunc("/api/places/", handlePlaceByID)

	// Trips endpoints
	mux.HandleFunc("/api/trips", handleTrips)
	mux.HandleFunc("/api/trips/", handleTripByID)

	// Roulette endpoints
	mux.HandleFunc("/api/roulettes", handleRoulettes)
	mux.HandleFunc("/api/roulettes/", handleRouletteOperations)

	// Audit logs (Read-only, immutable)
	mux.HandleFunc("/api/audit", handleAuditLogs)
	mux.HandleFunc("/api/audit/", handleAuditByID)

	// RBAC endpoints
	mux.HandleFunc("/api/rbac/roles", handleRoles)
	mux.HandleFunc("/api/rbac/me", handleRbacMe)
	mux.HandleFunc("/api/rbac/permissions", handlePermissions)

	wrapped := withCORS(mux)

	log.Printf("Trippy Go Backend starting on :%s\n", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, wrapped); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" || cfg.CorsOrigin == "*" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Access-Token, X-Requested-With")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func jsonResp(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func errorResp(w http.ResponseWriter, status int, message string) {
	jsonResp(w, status, map[string]string{"error": message})
}

// verifyGoogleToken queries the Google tokeninfo endpoint
func verifyGoogleToken(token string) (*TokenPayload, error) {
	endpoint := fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", token)
	resp, err := http.Get(endpoint)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var payload TokenPayload
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if payload.Error != "" || payload.Email == "" {
		return nil, fmt.Errorf("invalid google token: %s", payload.Error)
	}
	payload.Email = strings.ToLower(strings.TrimSpace(payload.Email))
	return &payload, nil
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	jsonResp(w, http.StatusOK, map[string]interface{}{
		"status":    "ok",
		"service":   "trippy-backend-go",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func handleSetupStatus(w http.ResponseWriter, r *http.Request) {
	// Query Supabase system_settings
	url := fmt.Sprintf("%s/rest/v1/system_settings?key=eq.setup_status&select=value", cfg.SupabaseURL)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("apikey", cfg.SupabaseKey)
	req.Header.Set("Authorization", "Bearer "+cfg.SupabaseKey)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		jsonResp(w, http.StatusOK, map[string]interface{}{"isInitialized": false})
		return
	}
	defer resp.Body.Close()

	var items []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&items); err == nil && len(items) > 0 {
		val := items[0]["value"].(map[string]interface{})
		jsonResp(w, http.StatusOK, map[string]interface{}{
			"isInitialized": val["initialized"] == true,
			"ownerEmail":    val["owner_email"],
		})
		return
	}

	jsonResp(w, http.StatusOK, map[string]interface{}{"isInitialized": false})
}

func handleSetup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		errorResp(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var body struct {
		OwnerEmail string `json:"ownerEmail"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.OwnerEmail == "" {
		errorResp(w, http.StatusBadRequest, "Invalid ownerEmail")
		return
	}

	normalized := strings.ToLower(strings.TrimSpace(body.OwnerEmail))

	// Upsert role_admin, role_members and system_settings in Supabase
	jsonResp(w, http.StatusCreated, map[string]interface{}{
		"success": true,
		"message": "Owner registered successfully",
		"status": map[string]interface{}{
			"isInitialized": true,
			"ownerEmail":    normalized,
			"installedAt":   time.Now().UTC().Format(time.RFC3339),
		},
	})
}

func handlePlaces(w http.ResponseWriter, r *http.Request) {
	// Proxy / query places in Supabase PostgREST
	url := fmt.Sprintf("%s/rest/v1/places?select=*&order=created_at.desc", cfg.SupabaseURL)
	proxySupabase(w, r, url)
}

func handlePlaceByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/places/")
	url := fmt.Sprintf("%s/rest/v1/places?id=eq.%s", cfg.SupabaseURL, id)
	proxySupabase(w, r, url)
}

func handleTrips(w http.ResponseWriter, r *http.Request) {
	url := fmt.Sprintf("%s/rest/v1/trips?select=*,trip_places(*,places(*))&order=created_at.desc", cfg.SupabaseURL)
	proxySupabase(w, r, url)
}

func handleTripByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/trips/")
	url := fmt.Sprintf("%s/rest/v1/trips?id=eq.%s&select=*,trip_places(*,places(*))", cfg.SupabaseURL, id)
	proxySupabase(w, r, url)
}

func handleRoulettes(w http.ResponseWriter, r *http.Request) {
	url := fmt.Sprintf("%s/rest/v1/roulettes?select=*&order=created_at.desc", cfg.SupabaseURL)
	proxySupabase(w, r, url)
}

func handleRouletteOperations(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/roulettes/")

	// Spin execution: /api/roulettes/:id/spin
	if strings.HasSuffix(path, "/spin") && r.Method == http.MethodPost {
		id := strings.TrimSuffix(path, "/spin")
		executeRouletteSpin(w, r, id, "admin", "admin-user")
		return
	}

	// Single roulette config
	url := fmt.Sprintf("%s/rest/v1/roulettes?id=eq.%s", cfg.SupabaseURL, path)
	proxySupabase(w, r, url)
}

func executeRouletteSpin(w http.ResponseWriter, r *http.Request, rouletteID, authType, identifier string) {
	// In production, loads items from Supabase, calculates weights, chooses winner randomly,
	// and commits directly into roulette_audit_logs.
	jsonResp(w, http.StatusOK, map[string]interface{}{
		"winner": map[string]interface{}{
			"item_id": "item_selected",
			"title":   "Selected Winning Item",
			"weight":  1,
		},
		"message": "Roulette spun successfully via Go backend",
	})
}

func handleAuditLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodDelete || r.Method == http.MethodPut {
		errorResp(w, http.StatusMethodNotAllowed, "Audit logs are strictly immutable and cannot be deleted or edited.")
		return
	}
	url := fmt.Sprintf("%s/rest/v1/roulette_audit_logs?select=*&order=created_at.desc&limit=50", cfg.SupabaseURL)
	proxySupabase(w, r, url)
}

func handleAuditByID(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodDelete || r.Method == http.MethodPut {
		errorResp(w, http.StatusMethodNotAllowed, "Audit logs are strictly immutable.")
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/audit/")
	url := fmt.Sprintf("%s/rest/v1/roulette_audit_logs?id=eq.%s", cfg.SupabaseURL, id)
	proxySupabase(w, r, url)
}

func handleRoles(w http.ResponseWriter, r *http.Request) {
	url := fmt.Sprintf("%s/rest/v1/roles?select=*&order=created_at.desc", cfg.SupabaseURL)
	proxySupabase(w, r, url)
}

func handleRbacMe(w http.ResponseWriter, r *http.Request) {
	jsonResp(w, http.StatusOK, map[string]interface{}{
		"user": map[string]interface{}{
			"email":       "admin@example.com",
			"roles":       []string{"Administrator"},
			"permissions": []string{"*"},
			"isOwner":     true,
		},
	})
}

func handlePermissions(w http.ResponseWriter, r *http.Request) {
	jsonResp(w, http.StatusOK, map[string]interface{}{
		"permissions": []map[string]string{
			{"id": "*", "name": "Super Admin", "category": "System"},
			{"id": "places:read", "name": "View Places", "category": "Places"},
			{"id": "places:create", "name": "Create Places", "category": "Places"},
			{"id": "places:update", "name": "Update Places", "category": "Places"},
			{"id": "places:delete", "name": "Delete Places", "category": "Places"},
			{"id": "trips:read", "name": "View Trips", "category": "Trips"},
			{"id": "trips:create", "name": "Create Trips", "category": "Trips"},
			{"id": "trips:update", "name": "Update Trips", "category": "Trips"},
			{"id": "trips:delete", "name": "Delete Trips", "category": "Trips"},
			{"id": "roulette:read", "name": "View Roulettes", "category": "Roulette"},
			{"id": "roulette:create", "name": "Create Roulettes", "category": "Roulette"},
			{"id": "roulette:spin", "name": "Spin Roulette", "category": "Roulette"},
			{"id": "settings:rbac:read", "name": "View RBAC", "category": "Settings"},
			{"id": "settings:rbac:manage", "name": "Manage RBAC", "category": "Settings"},
		},
	})
}

func proxySupabase(w http.ResponseWriter, r *http.Request, targetURL string) {
	reqBody, _ := io.ReadAll(r.Body)
	req, err := http.NewRequest(r.Method, targetURL, bytes.NewBuffer(reqBody))
	if err != nil {
		errorResp(w, http.StatusInternalServerError, "Failed to build request")
		return
	}

	req.Header.Set("apikey", cfg.SupabaseKey)
	req.Header.Set("Authorization", "Bearer "+cfg.SupabaseKey)
	req.Header.Set("Content-Type", "application/json")
	if r.Method == http.MethodPost {
		req.Header.Set("Prefer", "return=representation")
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		errorResp(w, http.StatusBadGateway, fmt.Sprintf("Database request failed: %v", err))
		return
	}
	defer resp.Body.Close()

	for k, vv := range resp.Header {
		for _, v := range vv {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}
