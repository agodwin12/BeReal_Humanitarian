const { DataTypes } = require("sequelize");

const timestamps = {
  createdAt: { type: DataTypes.DATE, allowNull: false },
  updatedAt: { type: DataTypes.DATE, allowNull: false },
};

const localized = (allowNull = false) => ({ type: DataTypes.JSONB, allowNull, defaultValue: allowNull ? null : {} });

const mediaRef = () => ({ type: DataTypes.INTEGER, allowNull: true, references: { model: "media", key: "id" }, onDelete: "SET NULL" });
const userRef = () => ({ type: DataTypes.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL" });

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable("media", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      storage: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "local" },
      key: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      url: { type: DataTypes.STRING(600), allowNull: false },
      filename: { type: DataTypes.STRING(255), allowNull: false },
      mimeType: { type: DataTypes.STRING(100), allowNull: false },
      size: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      width: { type: DataTypes.INTEGER, allowNull: true },
      height: { type: DataTypes.INTEGER, allowNull: true },
      variants: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      alt: localized(),
      caption: localized(),
      credit: { type: DataTypes.STRING(200), allowNull: true },
      consentOnFile: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      uploadedById: userRef(),
      ...timestamps,
    });
    await queryInterface.addIndex("media", ["mimeType"]);
    await queryInterface.addIndex("media", ["createdAt"]);

    await queryInterface.createTable("site_settings", {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      legalName: { type: DataTypes.STRING(200), allowNull: false },
      shortName: { type: DataTypes.STRING(80), allowNull: false },
      tagline: localized(),
      statusLine: localized(),
      neutralityStatement: localized(),
      fiscalYear: localized(),
      ein: { type: DataTypes.STRING(20), allowNull: true },
      showEin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      contactEmail: { type: DataTypes.STRING(190), allowNull: true },
      contactPhone: { type: DataTypes.STRING(40), allowNull: true },
      addressLine: { type: DataTypes.STRING(255), allowNull: true },
      addressNote: localized(),
      socialLinks: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      navigation: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      donateEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      donateDisabledMessage: localized(),
      enabledLocales: { type: DataTypes.JSONB, allowNull: false, defaultValue: ["en", "fr", "es"] },
      seoDescription: localized(),
      brandPrimary: { type: DataTypes.STRING(9), allowNull: true },
      brandAccent: { type: DataTypes.STRING(9), allowNull: true },
      logoMediaId: mediaRef(),
      faviconMediaId: mediaRef(),
      shareMediaId: mediaRef(),
      updatedById: userRef(),
      ...timestamps,
    });

    await queryInterface.createTable("programs", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      icon: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "heart-pulse" },
      tint: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "lavender" },
      name: localized(),
      cardLine1: localized(),
      cardLine2: localized(),
      summary: localized(),
      purpose: localized(),
      focusItems: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: [], fr: [], es: [] } },
      cardMediaId: mediaRef(),
      detailMediaId: mediaRef(),
      ...timestamps,
    });

    await queryInterface.createTable("team_members", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      role: localized(),
      bio: localized(),
      photoMediaId: mediaRef(),
      photoApprovedAt: { type: DataTypes.DATE, allowNull: true },
      photoApprovedBy: { type: DataTypes.STRING(120), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable("impact_metrics", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      key: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      icon: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "users" },
      label: localized(),
      value: { type: DataTypes.STRING(60), allowNull: true },
      documentedOn: { type: DataTypes.DATEONLY, allowNull: true },
      sourceNote: { type: DataTypes.TEXT, allowNull: true },
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps,
    });

    await queryInterface.createTable("impact_stories", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      title: localized(),
      body: localized(),
      mediaId: mediaRef(),
      consentConfirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      consentConfirmedAt: { type: DataTypes.DATE, allowNull: true },
      consentConfirmedBy: { type: DataTypes.STRING(120), allowNull: true },
      status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "draft" },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable("stewardship_updates", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      title: localized(),
      body: localized(),
      status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "draft" },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable("pages", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      slug: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      draft: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      published: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      draftUpdatedAt: { type: DataTypes.DATE, allowNull: true },
      draftUpdatedById: userRef(),
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      publishedById: userRef(),
      ...timestamps,
    });

    await queryInterface.createTable("page_versions", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      pageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "pages", key: "id" }, onDelete: "CASCADE" },
      content: { type: DataTypes.JSONB, allowNull: false },
      note: { type: DataTypes.STRING(200), allowNull: true },
      createdById: userRef(),
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("page_versions", ["pageId", "createdAt"]);

    await queryInterface.createTable("legal_pages", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      slug: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      title: localized(),
      body: localized(),
      effectiveDate: { type: DataTypes.DATEONLY, allowNull: true },
      publishedTitle: localized(),
      publishedBody: localized(),
      publishedEffectiveDate: { type: DataTypes.DATEONLY, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      draftUpdatedAt: { type: DataTypes.DATE, allowNull: true },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      publishedById: userRef(),
      ...timestamps,
    });

    await queryInterface.createTable("legal_page_versions", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      legalPageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "legal_pages", key: "id" }, onDelete: "CASCADE" },
      version: { type: DataTypes.INTEGER, allowNull: false },
      title: localized(),
      body: localized(),
      effectiveDate: { type: DataTypes.DATEONLY, allowNull: true },
      createdById: userRef(),
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("legal_page_versions", ["legalPageId", "version"]);
  },

  async down({ context: queryInterface }) {
    for (const table of [
      "legal_page_versions",
      "legal_pages",
      "page_versions",
      "pages",
      "stewardship_updates",
      "impact_stories",
      "impact_metrics",
      "team_members",
      "programs",
      "site_settings",
      "media",
    ]) {
      await queryInterface.dropTable(table);
    }
  },
};
