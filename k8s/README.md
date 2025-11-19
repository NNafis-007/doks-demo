This folder contains Kubernetes manifests for the demo (frontend + backend only).

Usage notes:
- Images in the manifests are already set to `nnafis007` (change if you want a different account).
- The frontend Service is `LoadBalancer` type to simulate a minimal production setup (this will create a cloud load balancer and may incur charges). The backend Service remains ClusterIP and is internal.

Apply all manifests:
  kubectl apply -f k8s/

Port-forward to test locally (alternatively to hitting the LoadBalancer public IP):
  kubectl port-forward svc/backend-svc 3000:3000
  kubectl port-forward svc/frontend-svc 8080:80

Note: With the frontend set as a `LoadBalancer`, DigitalOcean will provision a public load balancer and you can also reach the frontend at the external IP shown in `kubectl get svc frontend-svc` once the LB is provisioned.

Then open `http://localhost:8080` and the frontend will POST/GET to `http://localhost:3000/api/notes` (backend uses an in-memory store in this iteration).
