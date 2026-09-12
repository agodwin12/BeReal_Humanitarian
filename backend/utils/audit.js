const { AuditLog } = require("../models");

// Writes an audit entry. Never throws — a failed audit write must not break
// the action that triggered it (it is logged to the console instead).
async function record(req, { action, entity, entityId, before, after, meta }) {
  try {
    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      actorName: req.user ? req.user.name : meta?.actorName || null,
      action,
      entity: entity || null,
      entityId: entityId != null ? String(entityId) : null,
      before: before ?? null,
      after: after ?? null,
      meta: meta ?? null,
      ip: req.ip || null,
      userAgent: (req.get && req.get("user-agent") ? req.get("user-agent").slice(0, 255) : null),
    });
  } catch (error) {
    console.error("[audit] failed to record", action, error.message);
  }
}

module.exports = { record };
