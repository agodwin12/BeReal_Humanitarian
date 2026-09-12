const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable("users", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: true },
      role: { type: DataTypes.ENUM("super_admin", "editor", "read_only"), allowNull: false, defaultValue: "editor" },
      status: { type: DataTypes.ENUM("invited", "active", "disabled"), allowNull: false, defaultValue: "invited" },
      inviteTokenHash: { type: DataTypes.STRING, allowNull: true },
      inviteExpiresAt: { type: DataTypes.DATE, allowNull: true },
      resetTokenHash: { type: DataTypes.STRING, allowNull: true },
      resetExpiresAt: { type: DataTypes.DATE, allowNull: true },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
      invitedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("users", ["status"]);
    await queryInterface.addIndex("users", ["role"]);
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable("users");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_status";');
  },
};
