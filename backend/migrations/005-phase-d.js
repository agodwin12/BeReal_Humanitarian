const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    // Two-factor authentication (TOTP) — secrets are stored encrypted.
    await queryInterface.addColumn("users", "totpSecret", { type: DataTypes.STRING(400), allowNull: true });
    await queryInterface.addColumn("users", "totpPendingSecret", { type: DataTypes.STRING(400), allowNull: true });
    await queryInterface.addColumn("users", "totpEnabledAt", { type: DataTypes.DATE, allowNull: true });
    await queryInterface.addColumn("users", "totpRecoveryCodes", { type: DataTypes.JSONB, allowNull: false, defaultValue: [] });

    // "Reviewed by a native speaker" marks, tied to the exact text reviewed.
    await queryInterface.createTable("translation_reviews", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      fieldId: { type: DataTypes.STRING(220), allowNull: false },
      locale: { type: DataTypes.STRING(5), allowNull: false },
      textHash: { type: DataTypes.STRING(64), allowNull: false },
      reviewedById: { type: DataTypes.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
      reviewedBy: { type: DataTypes.STRING(120), allowNull: true },
      reviewedAt: { type: DataTypes.DATE, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("translation_reviews", ["fieldId", "locale"], { unique: true });

    // Every email the API tried to send (receipts, alerts, invites…).
    await queryInterface.createTable("email_logs", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      to: { type: DataTypes.STRING(500), allowNull: false },
      subject: { type: DataTypes.STRING(300), allowNull: false },
      kind: { type: DataTypes.STRING(60), allowNull: true },
      status: { type: DataTypes.STRING(20), allowNull: false },
      providerId: { type: DataTypes.STRING(120), allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("email_logs", ["createdAt"]);
    await queryInterface.addIndex("email_logs", ["status"]);
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable("email_logs");
    await queryInterface.dropTable("translation_reviews");
    for (const column of ["totpSecret", "totpPendingSecret", "totpEnabledAt", "totpRecoveryCodes"]) {
      await queryInterface.removeColumn("users", column);
    }
  },
};
