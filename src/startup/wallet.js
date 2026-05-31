/**
 * Restaura los archivos del Oracle Cloud wallet desde variables de entorno
 * codificadas en base64.
 *
 * En desarrollo local el wallet vive en ./wallet/ (ignorado en .gitignore).
 * En producción (Render, Railway, etc.) se inyectan como variables de entorno:
 *
 *   WALLET_TNSNAMES_B64    → wallet/tnsnames.ora
 *   WALLET_SQLNET_B64      → wallet/sqlnet.ora
 *   WALLET_EWALLET_PEM_B64 → wallet/ewallet.pem
 *   WALLET_OJDBC_B64       → wallet/ojdbc.properties
 *
 * Si ninguna de esas variables está definida se asume que el wallet ya existe
 * en el sistema de archivos (entorno local).
 */

/* istanbul ignore file */
import fs from "node:fs";
import path from "node:path";

const WALLET_FILES = {
  "tnsnames.ora":     "WALLET_TNSNAMES_B64",
  "sqlnet.ora":       "WALLET_SQLNET_B64",
  "ewallet.pem":      "WALLET_EWALLET_PEM_B64",
  "ojdbc.properties": "WALLET_OJDBC_B64",
};

export function setupWalletFromEnv() {
  const hasAny = Object.values(WALLET_FILES).some((k) => process.env[k]);
  if (!hasAny) return; // entorno local — wallet ya está en disco

  const walletDir = path.join(process.cwd(), "wallet");
  fs.mkdirSync(walletDir, { recursive: true });

  for (const [filename, envKey] of Object.entries(WALLET_FILES)) {
    const b64 = process.env[envKey];
    if (!b64) continue;
    const dest = path.join(walletDir, filename);
    fs.writeFileSync(dest, Buffer.from(b64, "base64"));
    console.log(`[wallet] ${filename} restaurado desde ${envKey}`);
  }
}
