export type PlaceType = 'Restaurant' | 'Mall' | 'Public spaces' | 'other';

export interface PlaceFile {
  id: string;
  name: string;
  url: string;
  path?: string;
  size?: number;
  mime_type?: string;
  uploaded_at?: string;
}

export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  description?: string;
  address?: string;
  gmaps_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  files: PlaceFile[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TripPlaceItem {
  id?: string;
  place_id: string;
  order_index: number;
  visit_time?: string;
  notes?: string;
  place?: Place;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  start_date?: string | null;
  end_date?: string | null;
  places?: TripPlaceItem[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RouletteItem {
  item_id: string;
  title: string;
  subtitle?: string;
  type: 'trips' | 'places';
  weight: number;
}

export interface Roulette {
  id: string;
  title: string;
  description?: string;
  type: 'trips' | 'places';
  items: RouletteItem[];
  protection_type: 'google' | 'token';
  allowed_emails: string[];
  access_token?: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RouletteAuditLog {
  id: string;
  roulette_id: string;
  roulette_title: string;
  type: 'trips' | 'places';
  selected_item_id: string;
  selected_item_title: string;
  candidate_pool: RouletteItem[];
  executed_by_type: 'google' | 'token' | 'admin';
  executed_by_identifier: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  members?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PermissionDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface UserAccessProfile {
  email: string;
  userId: string;
  roles: string[];
  permissions: string[];
  isOwner: boolean;
  ownerEmail?: string;
}

export interface SetupStatus {
  isInitialized: boolean;
  ownerEmail?: string;
  installedAt?: string;
}
