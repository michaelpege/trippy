# =============================================================================
# Trippy Makefile
# =============================================================================

.PHONY: help install dev dev-frontend dev-worker build build-frontend build-worker type-check lint clean

help:
	@echo "Available commands:"
	@echo "  make install         - Install all dependencies across monorepo"
	@echo "  make dev             - Run frontend and worker concurrently in dev mode"
	@echo "  make dev-frontend    - Run Next.js frontend only"
	@echo "  make dev-worker      - Run Cloudflare worker only"
	@echo "  make build           - Build frontend and worker for production"
	@echo "  make type-check      - Run TypeScript type checking on all packages"
	@echo "  make lint            - Run linting across all packages"

install:
	pnpm install

dev:
	pnpm dev

dev-frontend:
	pnpm --filter frontend dev

dev-worker:
	pnpm --filter worker dev

build:
	pnpm build

build-frontend:
	pnpm --filter frontend build

build-worker:
	pnpm --filter worker build

type-check:
	pnpm --filter frontend type-check
	pnpm --filter worker type-check

lint:
	pnpm -r lint

clean:
	rm -rf node_modules apps/frontend/.next apps/frontend/out apps/worker/.wrangler
