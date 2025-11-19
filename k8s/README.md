This folder contains Kubernetes manifests for the demo (frontend + backend only).

Quick Ingress (HTTP only) workflow

1) Install the ingress-nginx controller (LoadBalancer service)

Use the official `ingress-nginx` Helm chart (recommended). This avoids possible unavailable Bitnami image tags.

```bash
# add the official ingress-nginx repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# uninstall any existing bitnami release (if installed)
helm uninstall nginx-ingress -n ingress-nginx || true
kubectl delete namespace ingress-nginx --ignore-not-found

# install the official controller into namespace ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=LoadBalancer
```

Wait for the controller service to get an external IP:

```bash
kubectl get svc -n ingress-nginx -w
```

2) Apply the simple HTTP Ingress

```bash
kubectl apply -f k8s/ingress-no-tls.yaml
```

Troubleshooting image pull errors

- If pods show `ImagePullBackOff` with `not found`, the chart may reference an unavailable image tag. Using the official `ingress-nginx` chart above avoids this issue.
- If you still see image pull failures, check whether the cluster has egress access to Docker Hub or if a private registry is required. Inspect pod events:

```bash
kubectl -n ingress-nginx get pods
kubectl -n ingress-nginx describe pod <pod-name>
kubectl -n ingress-nginx logs <pod-name> -c controller
```

If the controller pod is `ImagePullBackOff`, try pulling the image manually on a node to reproduce the error or switch to a different chart version.

3) Validate

- Check ingress:
  `kubectl get ingress demo-ingress`
- Visit http://<INGRESS-IP> or the host you configured in the Ingress rules.

Notes
- This Ingress serves HTTP (not TLS). For production TLS, you should add cert-manager or provide a TLS secret.
- Replace `demo.example.com` in `ingress-no-tls.yaml` with your hostname or remove the host block to accept all hosts.

Run this repo in DigitalOcean Kubernetes (DOKS)
---------------------------------------------

Prerequisites (replace placeholders below before running):
- `DO_TOKEN` - your DigitalOcean API token (store it as a GitHub secret or env var)
- `DO_CLUSTER_NAME` - desired DOKS cluster name (e.g. `doks-demo`)
- `DO_REGION` - DigitalOcean region (e.g. `nyc1`)
- `DO_NODE_SIZE` - droplet size (e.g. `s-1vcpu-2gb`)
- `DO_NODE_COUNT` - number of nodes (e.g. `1`)
- `DOCKERHUB_USER` - your Docker Hub username (e.g. `nnafis007`)
- `DOMAIN` - optional hostname you will point to the ingress LB (e.g. `demo.example.com`)

1) Build and push images to Docker Hub

PowerShell example:
```powershell
cd D:/devopsNana/nana-practice-codes/demo1/doks-tutorial

# Login to Docker Hub (interactive)
docker login

# Build backend and frontend
docker build -t ${env:DOCKERHUB_USER}/demo-backend:latest -f backend/Dockerfile backend
docker build -t ${env:DOCKERHUB_USER}/demo-frontend:latest -f frontend/Dockerfile frontend

# Push images
docker push ${env:DOCKERHUB_USER}/demo-backend:latest
docker push ${env:DOCKERHUB_USER}/demo-frontend:latest
```

Bash example:
```bash
cd $(pwd)/doks-tutorial
docker login
docker build -t $DOCKERHUB_USER/demo-backend:latest -f backend/Dockerfile backend
docker build -t $DOCKERHUB_USER/demo-frontend:latest -f frontend/Dockerfile frontend
docker push $DOCKERHUB_USER/demo-backend:latest
docker push $DOCKERHUB_USER/demo-frontend:latest
```

2) Create a DOKS cluster (doctl)

```bash
# authenticate doctl (interactive)
doctl auth init --access-token "$DO_TOKEN"

# create cluster (single small node to keep costs low)
doctl kubernetes cluster create $DO_CLUSTER_NAME \
  --region $DO_REGION --tag doks-demo \
  --node-pool "name=pool1;size=$DO_NODE_SIZE;count=$DO_NODE_COUNT;auto-scale=false"

# save kubeconfig locally
doctl kubernetes cluster kubeconfig save $DO_CLUSTER_NAME
kubectl get nodes
```

3) Update manifests with your Docker Hub user (if needed)

Edit `doks-tutorial/k8s/backend-deployment.yaml` and `frontend-deployment.yaml` replacing image names with:
```
image: <DOCKERHUB_USER>/demo-backend:latest
image: <DOCKERHUB_USER>/demo-frontend:latest
```

4) Install ingress-nginx controller (LoadBalancer)

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace --set controller.service.type=LoadBalancer
kubectl -n ingress-nginx get svc -w
```

5) Apply app manifests and the Ingress

```bash
kubectl apply -f doks-tutorial/k8s/
kubectl get pods -w
kubectl get svc
kubectl get ingress demo-ingress
```

6) (Optional) Map a hostname to the ingress external IP

- Get the ingress controller external IP:
  ```bash
  kubectl get svc -n ingress-nginx
  ```
- Create an A record in your DNS provider mapping `$DOMAIN` → `<EXTERNAL-IP>`.
- For quick local testing edit your `/etc/hosts` (or `C:\Windows\System32\drivers\etc\hosts`) and add:
  ```text
  <EXTERNAL-IP>  $DOMAIN
  ```

7) Test the app

Open in browser: `http://<EXTERNAL-IP>` (or `http://$DOMAIN` if DNS/hosts set). The frontend will call `/api/notes` and the Ingress will route traffic to backend.

Quick curl tests (replace placeholders):
```bash
curl -v http://<EXTERNAL-IP>/
curl -v http://<EXTERNAL-IP>/api/notes
```

8) Cleanup (stop billing)

```bash
# delete k8s objects
kubectl delete -f doks-tutorial/k8s/

# delete cluster (destroys droplets)
doctl kubernetes cluster delete $DO_CLUSTER_NAME --force

# optional: remove local images
docker rmi $DOCKERHUB_USER/demo-backend:latest
docker rmi $DOCKERHUB_USER/demo-frontend:latest
```

Notes & tips
- Use `imagePullPolicy: Always` in manifests while iterating on `:latest` images.
- For production: use distinct image tags (commit SHA), secrets for credentials, persistent storage, and TLS.

This folder contains Kubernetes manifests for the demo (frontend + backend only).

Quick Ingress + TLS (self-signed) workflow

1) Install the Bitnami nginx-ingress controller (LoadBalancer service)

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm install nginx-ingress bitnami/nginx-ingress-controller \
  --namespace ingress-nginx --create-namespace \
  --set service.type=LoadBalancer
```

Wait for the controller service to get an external IP:

```bash
kubectl get svc -n ingress-nginx -w
```

2) Create a self-signed TLS cert and store as a TLS secret (for quick testing)

On Linux/macOS with OpenSSL installed:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=demo.example.com/O=demo"

# create secret in the cluster (default namespace)
kubectl create secret tls demo-tls --key tls.key --cert tls.crt
```

On Windows PowerShell (if OpenSSL is available):

```powershell
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout tls.key -out tls.crt `
  -subj "/CN=demo.example.com/O=demo"
kubectl create secret tls demo-tls --key tls.key --cert tls.crt
```

3) Apply the Ingress that uses the TLS secret

```bash
kubectl apply -f k8s/ingress-selfsigned.yaml
```

4) Validate

- Check ingress:
  `kubectl get ingress demo-ingress`
- Check TLS secret exists:
  `kubectl get secret demo-tls -o yaml`
- Visit https://demo.example.com (you will likely see a browser warning because the cert is self-signed).

Notes
- This approach uses a self-signed certificate (quick test). For production use, use cert-manager + Let's Encrypt or upload a real certificate into a Kubernetes TLS secret.
- Replace `demo.example.com` with your real hostname and point DNS A record to the ingress controller external IP.

