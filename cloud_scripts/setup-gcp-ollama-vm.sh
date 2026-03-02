#!/usr/bin/env bash

set -Eeuo pipefail

# -----------------------------------------------------------------------------
# Config (override via env vars, e.g. PROJECT_ID=... MODEL_NAME=... ./script.sh)
# -----------------------------------------------------------------------------
PROJECT_ID="${PROJECT_ID:-inbound-decker-475607-d6}"
INSTANCE_NAME="${INSTANCE_NAME:-ollama-vm}"
ZONE="${ZONE:-europe-west1-b}"
MACHINE_TYPE="${MACHINE_TYPE:-n2-highmem-8}"
BOOT_DISK_SIZE="${BOOT_DISK_SIZE:-100GB}"
BOOT_DISK_TYPE="${BOOT_DISK_TYPE:-pd-balanced}"
IMAGE_FAMILY="${IMAGE_FAMILY:-ubuntu-2204-lts}"
IMAGE_PROJECT="${IMAGE_PROJECT:-ubuntu-os-cloud}"

MODEL_NAME="${MODEL_NAME:-gemma2:27b}"

# Security:
# - Set ALLOWED_CIDR to your own public IP /32 for safer access.
# - If ALLOWED_CIDR=auto, script tries to detect your public IP.
ALLOWED_CIDR="${ALLOWED_CIDR:-auto}"
FIREWALL_RULE="${FIREWALL_RULE:-allow-ollama-11434}"
NETWORK_TAG="${NETWORK_TAG:-ollama-server}"

# Cost:
# SPOT=true makes a cheaper Spot VM.
SPOT="${SPOT:-true}"
# Optional Spot termination action (STOP or DELETE). Set empty to skip flag.
SPOT_TERMINATION_ACTION="${SPOT_TERMINATION_ACTION:-STOP}"

STARTUP_TMP="$(mktemp -t ollama-startup-XXXXXX.sh)"
cleanup() {
  rm -f "${STARTUP_TMP}"
}
trap cleanup EXIT

info() {
  echo "[setup-gcp-ollama] $*"
}

err() {
  echo "[setup-gcp-ollama] ERROR: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || err "Missing required command: $1"
}

resolve_allowed_cidr() {
  if [[ "${ALLOWED_CIDR}" != "auto" ]]; then
    echo "${ALLOWED_CIDR}"
    return
  fi

  require_cmd curl

  local ip
  ip="$(curl -fsS https://api.ipify.org || true)"
  if [[ -z "${ip}" ]]; then
    ip="$(curl -fsS https://ifconfig.me || true)"
  fi
  [[ -n "${ip}" ]] || err "Could not auto-detect public IP. Set ALLOWED_CIDR manually."
  echo "${ip}/32"
}

create_startup_script() {
  cat > "${STARTUP_TMP}" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

LOG_FILE="/var/log/ollama-startup.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "=== OLLAMA STARTUP BEGIN $(date -Iseconds) ==="
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y curl ca-certificates

curl -fsSL https://ollama.com/install.sh | sh

mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf <<'EOC'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_ORIGINS=*"
EOC

systemctl daemon-reload
systemctl enable ollama
systemctl restart ollama

# Wait until Ollama HTTP endpoint is reachable
for i in {1..90}; do
  if curl -fsS "http://127.0.0.1:11434/api/tags" >/dev/null; then
    break
  fi
  echo "Waiting for Ollama service..."
  sleep 2
done

OLLAMA_MODEL="__OLLAMA_MODEL__"
if ! ollama show "${OLLAMA_MODEL}" >/dev/null 2>&1; then
  echo "Pulling model: ${OLLAMA_MODEL}"
  ollama pull "${OLLAMA_MODEL}"
else
  echo "Model already present: ${OLLAMA_MODEL}"
fi

echo "=== OLLAMA STARTUP DONE $(date -Iseconds) ==="
EOF

  sed -i.bak "s|__OLLAMA_MODEL__|${MODEL_NAME}|g" "${STARTUP_TMP}"
  rm -f "${STARTUP_TMP}.bak"
}

instance_exists() {
  gcloud compute instances describe "${INSTANCE_NAME}" \
    --project="${PROJECT_ID}" \
    --zone="${ZONE}" \
    --format="value(name)" >/dev/null 2>&1
}

main() {
  require_cmd gcloud
  require_cmd awk

  local account
  account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1 || true)"
  [[ -n "${account}" ]] || err "No active gcloud account. Run: gcloud auth login"

  local resolved_cidr
  resolved_cidr="$(resolve_allowed_cidr)"

  info "Project: ${PROJECT_ID}"
  info "Instance: ${INSTANCE_NAME}"
  info "Zone: ${ZONE}"
  info "Machine: ${MACHINE_TYPE}"
  info "Model: ${MODEL_NAME}"
  info "Allowed CIDR: ${resolved_cidr}"
  info "Spot VM: ${SPOT}"

  create_startup_script

  gcloud config set project "${PROJECT_ID}" >/dev/null
  gcloud services enable compute.googleapis.com --project="${PROJECT_ID}" --quiet

  if gcloud compute firewall-rules describe "${FIREWALL_RULE}" \
    --project="${PROJECT_ID}" >/dev/null 2>&1; then
    info "Firewall rule exists, updating source ranges and target tag..."
    gcloud compute firewall-rules update "${FIREWALL_RULE}" \
      --project="${PROJECT_ID}" \
      --allow=tcp:11434 \
      --source-ranges="${resolved_cidr}" \
      --target-tags="${NETWORK_TAG}" \
      --quiet
  else
    info "Creating firewall rule..."
    gcloud compute firewall-rules create "${FIREWALL_RULE}" \
      --project="${PROJECT_ID}" \
      --allow=tcp:11434 \
      --source-ranges="${resolved_cidr}" \
      --target-tags="${NETWORK_TAG}" \
      --quiet
  fi

  if instance_exists; then
    info "Instance already exists. Updating startup metadata and ensuring it is running..."
    gcloud compute instances add-metadata "${INSTANCE_NAME}" \
      --project="${PROJECT_ID}" \
      --zone="${ZONE}" \
      --metadata-from-file=startup-script="${STARTUP_TMP}" \
      --quiet

    gcloud compute instances add-tags "${INSTANCE_NAME}" \
      --project="${PROJECT_ID}" \
      --zone="${ZONE}" \
      --tags="${NETWORK_TAG}" \
      --quiet || true

    local status
    status="$(gcloud compute instances describe "${INSTANCE_NAME}" \
      --project="${PROJECT_ID}" \
      --zone="${ZONE}" \
      --format="value(status)")"
    if [[ "${status}" != "RUNNING" ]]; then
      gcloud compute instances start "${INSTANCE_NAME}" \
        --project="${PROJECT_ID}" \
        --zone="${ZONE}" \
        --quiet
    fi
  else
    info "Creating VM..."
    create_cmd=(
      gcloud compute instances create "${INSTANCE_NAME}"
      --project="${PROJECT_ID}"
      --zone="${ZONE}"
      --machine-type="${MACHINE_TYPE}"
      --boot-disk-size="${BOOT_DISK_SIZE}"
      --boot-disk-type="${BOOT_DISK_TYPE}"
      --image-family="${IMAGE_FAMILY}"
      --image-project="${IMAGE_PROJECT}"
      --tags="${NETWORK_TAG}"
      --metadata-from-file=startup-script="${STARTUP_TMP}"
    )

    if [[ "${SPOT}" == "true" ]]; then
      create_cmd+=(--provisioning-model=SPOT --maintenance-policy=TERMINATE)
      if [[ -n "${SPOT_TERMINATION_ACTION}" ]]; then
        create_cmd+=(--instance-termination-action="${SPOT_TERMINATION_ACTION}")
      fi
    fi

    "${create_cmd[@]}"
  fi

  local external_ip
  external_ip="$(
    gcloud compute instances describe "${INSTANCE_NAME}" \
      --project="${PROJECT_ID}" \
      --zone="${ZONE}" \
      --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
  )"

  echo
  info "Done."
  info "External IP: ${external_ip}"
  info "Ollama URL: http://${external_ip}:11434"
  echo
  info "Watch startup log:"
  echo "  gcloud compute ssh ${INSTANCE_NAME} --zone ${ZONE} --project ${PROJECT_ID} --command 'sudo tail -f /var/log/ollama-startup.log'"
  echo
  info "Quick health check:"
  echo "  curl http://${external_ip}:11434/api/tags"
}

main "$@"
