module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: {
        type: DataTypes.STRING(190),
        allowNull: false,
        unique: true,
        set(value) {
          this.setDataValue("email", String(value).trim().toLowerCase());
        },
        validate: { isEmail: true },
      },
      // Null while the invitation has not been accepted yet.
      passwordHash: { type: DataTypes.STRING, allowNull: true },
      role: {
        type: DataTypes.ENUM("super_admin", "editor", "read_only"),
        allowNull: false,
        defaultValue: "editor",
      },
      status: {
        type: DataTypes.ENUM("invited", "active", "disabled"),
        allowNull: false,
        defaultValue: "invited",
      },
      inviteTokenHash: { type: DataTypes.STRING, allowNull: true },
      inviteExpiresAt: { type: DataTypes.DATE, allowNull: true },
      resetTokenHash: { type: DataTypes.STRING, allowNull: true },
      resetExpiresAt: { type: DataTypes.DATE, allowNull: true },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
      invitedById: { type: DataTypes.INTEGER, allowNull: true },
      // Two-factor authentication (Phase D). Secrets are encrypted at rest.
      totpSecret: { type: DataTypes.STRING(400), allowNull: true },
      totpPendingSecret: { type: DataTypes.STRING(400), allowNull: true },
      totpEnabledAt: { type: DataTypes.DATE, allowNull: true },
      totpRecoveryCodes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    },
    { tableName: "users", timestamps: true },
  );

  // Never let secrets leave the API.
  User.prototype.toSafeJSON = function toSafeJSON() {
    const { id, name, email, role, status, lastLoginAt, invitedById, createdAt, updatedAt, totpSecret, totpEnabledAt, totpRecoveryCodes } = this.get();
    return {
      id,
      name,
      email,
      role,
      status,
      lastLoginAt,
      invitedById,
      createdAt,
      updatedAt,
      twoFactorEnabled: Boolean(totpSecret),
      twoFactorEnabledAt: totpSecret ? totpEnabledAt : null,
      recoveryCodesLeft: totpSecret ? (Array.isArray(totpRecoveryCodes) ? totpRecoveryCodes.length : 0) : null,
    };
  };

  return User;
};
