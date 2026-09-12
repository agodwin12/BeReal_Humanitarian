const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable("audit_logs", {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      actorName: { type: DataTypes.STRING(120), allowNull: true },
      action: { type: DataTypes.STRING(80), allowNull: false },
      entity: { type: DataTypes.STRING(60), allowNull: true },
      entityId: { type: DataTypes.STRING(60), allowNull: true },
      before: { type: DataTypes.JSONB, allowNull: true },
      after: { type: DataTypes.JSONB, allowNull: true },
      meta: { type: DataTypes.JSONB, allowNull: true },
      ip: { type: DataTypes.STRING(64), allowNull: true },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("audit_logs", ["userId"]);
    await queryInterface.addIndex("audit_logs", ["action"]);
    await queryInterface.addIndex("audit_logs", ["entity", "entityId"]);
    await queryInterface.addIndex("audit_logs", ["createdAt"]);
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable("audit_logs");
  },
};
