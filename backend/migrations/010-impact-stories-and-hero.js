const { DataTypes } = require("sequelize");

// Turns "impact stories" into full outreach case studies, lets a Gallery photo
// point back to the story it belongs to (so the site can offer "View Full
// Impact Story"), and gives the homepage hero a rotating set of photos
// (Site settings → Hero carousel) instead of one fixed image.
module.exports = {
  async up({ context: queryInterface }) {
    // ---- impact_stories: from a single blurb to a case study --------------
    await queryInterface.addColumn("impact_stories", "slug", { type: DataTypes.STRING(160), allowNull: true, unique: true });
    await queryInterface.addColumn("impact_stories", "programId", { type: DataTypes.INTEGER, allowNull: true, references: { model: "programs", key: "id" }, onDelete: "SET NULL" });
    await queryInterface.addColumn("impact_stories", "happenedOn", { type: DataTypes.DATEONLY, allowNull: true });
    await queryInterface.addColumn("impact_stories", "location", { type: DataTypes.STRING(160), allowNull: true });
    await queryInterface.addColumn("impact_stories", "purpose", { type: DataTypes.JSONB, allowNull: false, defaultValue: {} });
    await queryInterface.addColumn("impact_stories", "whatWeDid", { type: DataTypes.JSONB, allowNull: false, defaultValue: {} });
    await queryInterface.addColumn("impact_stories", "summary", { type: DataTypes.JSONB, allowNull: false, defaultValue: {} });
    await queryInterface.addColumn("impact_stories", "assistanceProvided", { type: DataTypes.JSONB, allowNull: false, defaultValue: {} });
    await queryInterface.addColumn("impact_stories", "peopleReachedCount", { type: DataTypes.INTEGER, allowNull: true });
    await queryInterface.addColumn("impact_stories", "peopleReachedUnit", { type: DataTypes.JSONB, allowNull: false, defaultValue: {} });
    // "body" is superseded by "summary" (short takeaway) + "whatWeDid" (the narrative); no live rows use it.
    await queryInterface.removeColumn("impact_stories", "body");
    await queryInterface.addIndex("impact_stories", ["slug"]);
    await queryInterface.addIndex("impact_stories", ["programId"]);
    await queryInterface.addIndex("impact_stories", ["happenedOn"]);

    // ---- gallery_items: optional link back to the story it documents ------
    await queryInterface.addColumn("gallery_items", "impactStoryId", { type: DataTypes.INTEGER, allowNull: true, references: { model: "impact_stories", key: "id" }, onDelete: "SET NULL" });
    await queryInterface.addIndex("gallery_items", ["impactStoryId"]);

    // ---- site_settings: ordered list of media ids for the hero carousel ---
    await queryInterface.addColumn("site_settings", "heroSlideIds", { type: DataTypes.JSONB, allowNull: false, defaultValue: [] });
  },

  async down({ context: queryInterface }) {
    await queryInterface.removeColumn("site_settings", "heroSlideIds");
    await queryInterface.removeIndex("gallery_items", ["impactStoryId"]);
    await queryInterface.removeColumn("gallery_items", "impactStoryId");
    await queryInterface.removeIndex("impact_stories", ["happenedOn"]);
    await queryInterface.removeIndex("impact_stories", ["programId"]);
    await queryInterface.removeIndex("impact_stories", ["slug"]);
    await queryInterface.addColumn("impact_stories", "body", { type: DataTypes.JSONB, allowNull: false, defaultValue: {} });
    await queryInterface.removeColumn("impact_stories", "peopleReachedUnit");
    await queryInterface.removeColumn("impact_stories", "peopleReachedCount");
    await queryInterface.removeColumn("impact_stories", "assistanceProvided");
    await queryInterface.removeColumn("impact_stories", "summary");
    await queryInterface.removeColumn("impact_stories", "whatWeDid");
    await queryInterface.removeColumn("impact_stories", "purpose");
    await queryInterface.removeColumn("impact_stories", "location");
    await queryInterface.removeColumn("impact_stories", "happenedOn");
    await queryInterface.removeColumn("impact_stories", "programId");
    await queryInterface.removeColumn("impact_stories", "slug");
  },
};
