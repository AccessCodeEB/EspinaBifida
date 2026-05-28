import { migrateColumnToClob } from "./helpers/migrateColumnToClob.js";

export async function runMigration001() {
  await migrateColumnToClob("BENEFICIARIOS", "[migration-001]");
}
