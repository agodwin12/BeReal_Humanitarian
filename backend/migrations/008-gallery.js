const { DataTypes } = require("sequelize");

// "Our Work in Action" gallery: photos and videos of the organization's
// outreach, each with a title, a description (EN / FR / ES) and the day it
// happened. A video is either an uploaded file (media row) or a YouTube /
// Vimeo link.
module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable("gallery_items", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // image | video
      kind: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "image" },
      mediaId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "media", key: "id" }, onDelete: "SET NULL" },
      videoUrl: { type: DataTypes.STRING(500), allowNull: true },
      title: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      description: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      happenedOn: { type: DataTypes.DATEONLY, allowNull: true },
      location: { type: DataTypes.STRING(160), allowNull: true },
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdById: { type: DataTypes.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("gallery_items", ["happenedOn"]);
    await queryInterface.addIndex("gallery_items", ["published"]);
    await queryInterface.addIndex("gallery_items", ["mediaId"]);
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable("gallery_items");
  },
};
