# DOKS Mini Tutorial

This tutorial demonstrates deploying a tiny full-stack app to DigitalOcean Kubernetes (DOKS) while keeping costs minimal.

Overview
- Frontend: static HTML served from an `nginx` container.
-- Backend: Node.js + Express using an in-memory store (no external DB for this phase).
-- Database: dropped for now to focus on frontend+backend deployment.

Cost-conscious choices
- A single DOKS node: `s-1vcpu-2gb` (smallest recommended droplet for DOKS).
- The frontend service uses a `LoadBalancer` to simulate a minimal production setup (this will provision a cloud LB and may incur small charges). The backend remains internal (ClusterIP) and we still provide `kubectl port-forward` options for local testing.
-- Postgres is removed in this iteration; we'll focus on deploying the frontend and backend microservices.

Resources used
- 1 DOKS droplet (node) — e.g. `s-1vcpu-2gb` (~$6/mo).
- Docker Hub account to host images (free tier available).
- Kubernetes objects inside cluster (Deployments + ClusterIP Services).

Files in this folder
- `backend/` - Node API, `Dockerfile`.
- `frontend/` - static `index.html`, `Dockerfile` (nginx).
- `k8s/` - Kubernetes manifests for `postgres`, `backend`, `frontend`, and services.

Quick flow
1. Build backend & frontend images and push to Docker Hub.
2. Create single-node DOKS cluster using `doctl` or the DigitalOcean UI.
3. Apply Kubernetes manifests (`kubectl apply -f k8s/`).
4. Use `kubectl port-forward` to access the app locally (no LoadBalancer).
5. Cleanup cluster to avoid further charges.

See the rest of files for code and commands.
