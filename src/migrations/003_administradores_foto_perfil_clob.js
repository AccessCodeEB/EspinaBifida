import { migrateColumnToClob } from "./helpers/migrateColumnToClob.js";

export async function runMigration003() {
  await migrateColumnToClob("ADMINISTRADORES", "[migration-003]");
}
