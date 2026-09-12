module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      // Denormalized so the log stays readable if the user is later renamed.
      actorName: { type: DataTypes.STRING(120), allowNull: true },
      // e.g. "auth.login", "users.invite", "users.role_changed"
      action: { type: DataTypes.STRING(80), allowNull: false },
      // e.g. "user", "page", "donation"
      entity: { type: DataTypes.STRING(60), allowNull: true },
      entityId: { type: DataTypes.STRING(60), allowNull: true },
      before: { type: DataTypes.JSONB, allowNull: true },
      after: { type: DataTypes.JSONB, allowNull: true },
      meta: { type: DataTypes.JSONB, allowNull: true },
      ip: { type: DataTypes.STRING(64), allowNull: true },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: "audit_logs", timestamps: true, updatedAt: false },
  );

  return AuditLog;
};
