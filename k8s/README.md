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

