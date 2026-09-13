// Daily backup (cron on the server, or `npm run backup` by hand):
// content JSON + PostgreSQL dump + media archive into BACKUP_DIR, status
// written to BACKUP_STATUS_PATH for the System screen. Exit code 1 on failure
// so cron mail / logs show it.
require("dotenv").config();

const { sequelize } = require("../models");
const { runBackup } = require("../services/backup.service");

(async () => {
  try {
    await sequelize.authenticate();
    const summary = await runBackup();
    const files = summary.files.map((f) => `${f.name} (${Math.round(f.sizeBytes / 1024)} KB)`).join(", ");
    console.log(`[backup] ${summary.status} in ${summary.durationMs} ms — ${files || "no files"}${summary.warnings.length ? ` — warnings: ${summary.warnings.join("; ")}` : ""}${summary.error ? ` — error: ${summary.error}` : ""}`);
    await sequelize.close();
    process.exit(summary.status === "ok" ? 0 : 1);
  } catch (error) {
    console.error("[backup] failed:", error.message);
    process.exit(1);
  }
})();
