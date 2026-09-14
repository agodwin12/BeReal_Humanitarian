// Phase C content models, defined together because they are small and share
// the same localized-JSONB shape ({ en, fr, es }).
const localized = (DataTypes) => ({ type: DataTypes.JSONB, allowNull: false, defaultValue: {} });

module.exports = (sequelize, DataTypes) => {
  const Media = sequelize.define(
    "Media",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      storage: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "local" },
      key: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      url: { type: DataTypes.STRING(600), allowNull: false },
      filename: { type: DataTypes.STRING(255), allowNull: false },
      mimeType: { type: DataTypes.STRING(100), allowNull: false },
      size: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      width: { type: DataTypes.INTEGER, allowNull: true },
      height: { type: DataTypes.INTEGER, allowNull: true },
      // { thumb: { key, url, width, height }, medium: …, large: … }
      variants: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      alt: localized(DataTypes),
      caption: localized(DataTypes),
      credit: { type: DataTypes.STRING(200), allowNull: true },
      consentOnFile: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      uploadedById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "media", timestamps: true },
  );

  const SiteSetting = sequelize.define(
    "SiteSetting",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      legalName: { type: DataTypes.STRING(200), allowNull: false },
      shortName: { type: DataTypes.STRING(80), allowNull: false },
      tagline: localized(DataTypes),
      statusLine: localized(DataTypes),
      neutralityStatement: localized(DataTypes),
      fiscalYear: localized(DataTypes),
      ein: { type: DataTypes.STRING(20), allowNull: true },
      showEin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      contactEmail: { type: DataTypes.STRING(190), allowNull: true },
      contactPhone: { type: DataTypes.STRING(40), allowNull: true },
      addressLine: { type: DataTypes.STRING(255), allowNull: true },
      addressNote: localized(DataTypes),
      // [{ platform, url }]
      socialLinks: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      // [{ key, href, visible }] in display order
      navigation: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      donateEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      donateDisabledMessage: localized(DataTypes),
      enabledLocales: { type: DataTypes.JSONB, allowNull: false, defaultValue: ["en", "fr", "es"] },
      seoDescription: localized(DataTypes),
      brandPrimary: { type: DataTypes.STRING(9), allowNull: true },
      brandAccent: { type: DataTypes.STRING(9), allowNull: true },
      logoMediaId: { type: DataTypes.INTEGER, allowNull: true },
      faviconMediaId: { type: DataTypes.INTEGER, allowNull: true },
      shareMediaId: { type: DataTypes.INTEGER, allowNull: true },
      updatedById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "site_settings", timestamps: true },
  );

  const Program = sequelize.define(
    "Program",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      icon: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "heart-pulse" },
      tint: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "lavender" },
      name: localized(DataTypes),
      cardLine1: localized(DataTypes),
      cardLine2: localized(DataTypes),
      summary: localized(DataTypes),
      purpose: localized(DataTypes),
      // { en: [..], fr: [..], es: [..] }
      focusItems: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: [], fr: [], es: [] } },
      cardMediaId: { type: DataTypes.INTEGER, allowNull: true },
      detailMediaId: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "programs", timestamps: true },
  );

  const TeamMember = sequelize.define(
    "TeamMember",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      role: localized(DataTypes),
      bio: localized(DataTypes),
      photoMediaId: { type: DataTypes.INTEGER, allowNull: true },
      // A photo goes live only once the person has approved it (brief rule).
      photoApprovedAt: { type: DataTypes.DATE, allowNull: true },
      photoApprovedBy: { type: DataTypes.STRING(120), allowNull: true },
    },
    { tableName: "team_members", timestamps: true },
  );

  const ImpactMetric = sequelize.define(
    "ImpactMetric",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      key: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      icon: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "users" },
      label: localized(DataTypes),
      value: { type: DataTypes.STRING(60), allowNull: true },
      documentedOn: { type: DataTypes.DATEONLY, allowNull: true },
      sourceNote: { type: DataTypes.TEXT, allowNull: true },
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: "impact_metrics", timestamps: true },
  );

  // Gallery: photos and videos of the outreach, with the day they happened.
  const GalleryItem = sequelize.define(
    "GalleryItem",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      kind: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "image" },
      mediaId: { type: DataTypes.INTEGER, allowNull: true },
      videoUrl: { type: DataTypes.STRING(500), allowNull: true },
      title: localized(DataTypes),
      description: localized(DataTypes),
      happenedOn: { type: DataTypes.DATEONLY, allowNull: true },
      location: { type: DataTypes.STRING(160), allowNull: true },
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "gallery_items", timestamps: true },
  );

  const ImpactStory = sequelize.define(
    "ImpactStory",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      title: localized(DataTypes),
      body: localized(DataTypes),
      mediaId: { type: DataTypes.INTEGER, allowNull: true },
      consentConfirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      consentConfirmedAt: { type: DataTypes.DATE, allowNull: true },
      consentConfirmedBy: { type: DataTypes.STRING(120), allowNull: true },
      status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "draft" },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "impact_stories", timestamps: true },
  );

  const StewardshipUpdate = sequelize.define(
    "StewardshipUpdate",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      title: localized(DataTypes),
      body: localized(DataTypes),
      status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "draft" },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "stewardship_updates", timestamps: true },
  );

  const Page = sequelize.define(
    "Page",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      slug: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      // { messages: { en: { "Hero.title": "…" } }, images: { hero: 12 }, sections: [{ key, visible }] }
      draft: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      published: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      draftUpdatedAt: { type: DataTypes.DATE, allowNull: true },
      draftUpdatedById: { type: DataTypes.INTEGER, allowNull: true },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      publishedById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "pages", timestamps: true },
  );

  const PageVersion = sequelize.define(
    "PageVersion",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      pageId: { type: DataTypes.INTEGER, allowNull: false },
      content: { type: DataTypes.JSONB, allowNull: false },
      note: { type: DataTypes.STRING(200), allowNull: true },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "page_versions", timestamps: true, updatedAt: false },
  );

  const LegalPage = sequelize.define(
    "LegalPage",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      slug: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      title: localized(DataTypes),
      body: localized(DataTypes),
      effectiveDate: { type: DataTypes.DATEONLY, allowNull: true },
      publishedTitle: localized(DataTypes),
      publishedBody: localized(DataTypes),
      publishedEffectiveDate: { type: DataTypes.DATEONLY, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      draftUpdatedAt: { type: DataTypes.DATE, allowNull: true },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      publishedById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "legal_pages", timestamps: true },
  );

  const LegalPageVersion = sequelize.define(
    "LegalPageVersion",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      legalPageId: { type: DataTypes.INTEGER, allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false },
      title: localized(DataTypes),
      body: localized(DataTypes),
      effectiveDate: { type: DataTypes.DATEONLY, allowNull: true },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "legal_page_versions", timestamps: true, updatedAt: false },
  );

  return { Media, SiteSetting, Program, TeamMember, ImpactMetric, ImpactStory, StewardshipUpdate, Page, PageVersion, LegalPage, LegalPageVersion, GalleryItem };
};
