const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const env = require("../config/env");
const pkg = require("../package.json");
const models = require("../models");
const storage = require("./storage.service");

const run = promisify(execFile);

// Content export (every editorial table as JSON) — used by the System screen's
// "Download content backup" button and by the daily backup job.
async function buildContentExport() {
  const plain = (rows) => rows.map((r) => r.get({ plain: true }));
  return {
    exportedAt: new Date().toISOString(),
    apiVersion: pkg.version,
    siteSettings: plain(await models.SiteSetting.findAll()),
    media: plain(await models.Media.findAll()),
    programs: plain(await models.Program.findAll()),
    teamMembers: plain(await models.TeamMember.findAll()),
    impactMetrics: plain(await models.ImpactMetric.findAll()),
    impactStories: plain(await models.ImpactStory.findAll()),
    stewardshipUpdates: plain(await models.StewardshipUpdate.findAll()),
    pages: plain(await models.Page.findAll()),
    pageVersions: plain(await models.PageVersion.findAll()),
    legalPages: plain(await models.LegalPage.findAll()),
    legalPageVersions: plain(await models.LegalPageVersion.findAll()),
    notificationSettings: plain(await models.NotificationSetting.findAll()),
    translationReviews: plain(await models.TranslationReview.findAll()),
    donationSettings: plain(await models.DonationSetting.findAll()),
  };
}

const stamp = (d = new Date()) => d.toISOString().slice(0, 10);
const sizeOf = (file) => (fs.existsSync(file) ? fs.statSync(file).size : 0);

// Daily backup: content JSON + full PostgreSQL dump + archive of the uploaded
// media (local storage driver). Old sets are pruned after `keepDays`. The
// outcome is written to the status file the System screen reads.
async function runBackup({ dir = env.backup.dir, statusPath = env.backup.statusPath, keepDays = env.backup.keepDays } = {}) {
  const startedAt = new Date();
  const day = stamp(startedAt);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  const warnings = [];

  const finish = async (status, error) => {
    const sizeBytes = files.reduce((n, f) => n + f.sizeBytes, 0);
    const summary = {
      status,
      lastRunAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      sizeBytes,
      files,
      warnings,
      error: error || null,
      location: `${dir} — daily: content JSON + PostgreSQL dump + media archive, ${keepDays} days kept`,
    };
    fs.mkdirSync(path.dirname(statusPath), { recursive: true });
    fs.writeFileSync(statusPath, JSON.stringify(summary, null, 2));
    return summary;
  };

  try {
    // 1. Content JSON (what the portal button downloads).
    const jsonFile = path.join(dir, `content-${day}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(await buildContentExport(), null, 2));
    files.push({ name: path.basename(jsonFile), sizeBytes: sizeOf(jsonFile) });

    // 2. Full database dump (custom format: restore with pg_restore).
    const dumpFile = path.join(dir, `db-${day}.dump`);
    const args = env.db.url ? [env.db.url] : ["-h", env.db.host, "-p", String(env.db.port), "-U", env.db.user, env.db.name];
    await run("pg_dump", [...args, "-Fc", "-f", dumpFile], { env: { ...process.env, PGPASSWORD: env.db.password || "" }, maxBuffer: 64 * 1024 * 1024 });
    files.push({ name: path.basename(dumpFile), sizeBytes: sizeOf(dumpFile) });

    // 3. Uploaded media (only meaningful with the local storage driver).
    if (storage.driver === "local") {
      const uploads = storage.UPLOAD_DIR;
      if (fs.existsSync(uploads)) {
        const tarFile = path.join(dir, `uploads-${day}.tar.gz`);
        await run("tar", ["-czf", tarFile, "-C", path.dirname(uploads), path.basename(uploads)], { maxBuffer: 64 * 1024 * 1024 });
        files.push({ name: path.basename(tarFile), sizeBytes: sizeOf(tarFile) });
      } else warnings.push("uploads folder not found — no media archived");
    } else warnings.push("media lives in Cloudflare R2 — not archived here");

    // 4. Prune sets older than keepDays.
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
    for (const name of fs.readdirSync(dir)) {
      const m = name.match(/^(content|db|uploads)-(\d{4}-\d{2}-\d{2})\.(json|dump|tar\.gz)$/);
      if (m && new Date(`${m[2]}T00:00:00Z`).getTime() < cutoff) fs.unlinkSync(path.join(dir, name));
    }
    return finish("ok", null);
  } catch (error) {
    return finish("failed", error.message);
  }
}

module.exports = { buildContentExport, runBackup };
