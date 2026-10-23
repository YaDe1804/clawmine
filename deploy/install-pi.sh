#!/usr/bin/env bash
# Raspberry Pi (ARM64 Linux) installer for a local-only OpenClaw drop-box.
# Run as root. Optional LUKS data volume: ./install-pi.sh --luks
set -euo pipefail

OPENCLAW_USER="openclaw"
INSTALL_ROOT="/opt/openclaw"
STATE_ROOT="/var/lib/openclaw"
ENV_FILE="/etc/openclaw/openclaw.env"
SERVICE_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/openclaw.service"
NODE_MAJOR="22"
ENABLE_LUKS=0

usage() {
  cat <<'EOF'
Usage: sudo ./install-pi.sh [--luks]

  --luks   Create a LUKS file container at /var/lib/openclaw/luks.img and
           mount it at /opt/openclaw (destructive; requires cryptsetup).
EOF
}

log() {
  printf '%s\n' "$*"
}

die() {
  printf 'install-pi: %s\n' "$*" >&2
  exit 1
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    die "this script must run as root"
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --luks)
        ENABLE_LUKS=1
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        usage >&2
        die "unknown argument: $1"
        ;;
    esac
  done
}

ensure_user() {
  if ! id -u "${OPENCLAW_USER}" >/dev/null 2>&1; then
    useradd --system --create-home --home-dir "/home/${OPENCLAW_USER}" \
      --shell /usr/sbin/nologin "${OPENCLAW_USER}"
  fi
}

install_node() {
  export NVM_DIR="/home/${OPENCLAW_USER}/.nvm"
  if [[ ! -s "${NVM_DIR}/nvm.sh" ]]; then
    mkdir -p "${NVM_DIR}"
    local nvm_installer
    nvm_installer="$(mktemp)"
    curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh" -o "${nvm_installer}"
    NVM_DIR="${NVM_DIR}" bash "${nvm_installer}"
    rm -f "${nvm_installer}"
    chown -R "${OPENCLAW_USER}:${OPENCLAW_USER}" "${NVM_DIR}"
  fi
  # nvm is a shell function; run installs as the service user.
  su -s /bin/bash "${OPENCLAW_USER}" -c "
    export NVM_DIR='${NVM_DIR}'
    . \"\${NVM_DIR}/nvm.sh\"
    nvm install ${NODE_MAJOR}
    nvm alias default ${NODE_MAJOR}
    npm install -g pnpm@10
  "
}

install_ollama() {
  if ! command -v ollama >/dev/null 2>&1; then
    local installer
    installer="$(mktemp)"
    curl -fsSL https://ollama.com/install.sh -o "${installer}"
    bash "${installer}"
    rm -f "${installer}"
  fi
  systemctl enable --now ollama.service || true
  ollama pull bge-m3
}

setup_luks() {
  command -v cryptsetup >/dev/null 2>&1 || die "cryptsetup is required for --luks"
  mkdir -p "${STATE_ROOT}"
  local img="${STATE_ROOT}/luks.img"
  if [[ ! -f "${img}" ]]; then
    fallocate -l 8G "${img}"
    cryptsetup luksFormat --type luks2 "${img}"
  fi
  if ! cryptsetup status openclaw >/dev/null 2>&1; then
    cryptsetup open "${img}" openclaw
  fi
  if ! blkid "/dev/mapper/openclaw" >/dev/null 2>&1; then
    mkfs.ext4 "/dev/mapper/openclaw"
  fi
  mkdir -p "${INSTALL_ROOT}"
  mount "/dev/mapper/openclaw" "${INSTALL_ROOT}"
}

write_env_file() {
  mkdir -p "$(dirname "${ENV_FILE}")"
  if [[ ! -f "${ENV_FILE}" ]]; then
    cat > "${ENV_FILE}" <<'EOF'
# Local-only OpenClaw environment. Do not add cloud provider API keys.
NODE_ENV=production
HOME=/home/openclaw
PATH=/home/openclaw/.nvm/versions/node/current/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
OPENCLAW_STATE_DIR=/var/lib/openclaw
EOF
    chmod 0640 "${ENV_FILE}"
    chown "root:${OPENCLAW_USER}" "${ENV_FILE}"
  fi
}

install_tree() {
  mkdir -p "${INSTALL_ROOT}" "${STATE_ROOT}"
  if [[ -d "${SERVICE_SRC%/*}/../dist" ]]; then
    # Copy from the checkout that invoked this script when dist is present.
    rsync -a --delete "${SERVICE_SRC%/*}/../dist" "${INSTALL_ROOT}/"
    rsync -a "${SERVICE_SRC%/*}/../package.json" "${INSTALL_ROOT}/" || true
  fi
  chown -R "${OPENCLAW_USER}:${OPENCLAW_USER}" "${INSTALL_ROOT}" "${STATE_ROOT}" \
    "/home/${OPENCLAW_USER}"
}

install_service() {
  install -m 0644 "${SERVICE_SRC}" /etc/systemd/system/openclaw.service
  # Point ExecStart at the nvm-managed node binary when present.
  local node_bin
  node_bin="$(su -s /bin/bash "${OPENCLAW_USER}" -c '
    export NVM_DIR="$HOME/.nvm"
    . "$NVM_DIR/nvm.sh"
    command -v node
  ')"
  if [[ -n "${node_bin}" ]]; then
    sed -i "s|^ExecStart=node |ExecStart=${node_bin} |" /etc/systemd/system/openclaw.service
  fi
  systemctl daemon-reload
  systemctl enable --now openclaw.service
}

main() {
  require_root
  parse_args "$@"
  ensure_user
  install_node
  install_ollama
  if [[ "${ENABLE_LUKS}" -eq 1 ]]; then
    setup_luks
  else
    mkdir -p "${INSTALL_ROOT}"
  fi
  write_env_file
  install_tree
  install_service
  log "OpenClaw gateway service enabled. Check: systemctl status openclaw"
}

main "$@"
