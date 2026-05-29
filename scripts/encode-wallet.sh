#!/bin/bash
# Genera las variables de entorno base64 del wallet Oracle para Render/cloud.
# Uso: bash scripts/encode-wallet.sh
#
# Copia la salida y pégala en Render → Environment Variables.

WALLET_DIR="${1:-wallet}"

if [ ! -d "$WALLET_DIR" ]; then
  echo "Error: directorio '$WALLET_DIR' no encontrado." >&2
  exit 1
fi

encode_file() {
  local file="$WALLET_DIR/$1"
  local var="$2"
  if [ -f "$file" ]; then
    local b64
    b64=$(base64 -i "$file" 2>/dev/null || base64 "$file")
    b64=$(echo "$b64" | tr -d '\n')
    echo "${var}=${b64}"
  else
    echo "# ADVERTENCIA: $file no encontrado — $var omitida" >&2
  fi
}

echo "# Wallet Oracle Cloud — $(date)"
echo "# Pegar en Render → Environment Variables"
echo ""
encode_file "tnsnames.ora"     "WALLET_TNSNAMES_B64"
encode_file "sqlnet.ora"       "WALLET_SQLNET_B64"
encode_file "ewallet.pem"      "WALLET_EWALLET_PEM_B64"
encode_file "ojdbc.properties" "WALLET_OJDBC_B64"
