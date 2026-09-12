const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable("form_submissions", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      type: { type: DataTypes.ENUM("volunteer", "partnership", "assistance", "contact"), allowNull: false },
      locale: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
      name: { type: DataTypes.STRING(160), allowNull: true },
      email: { type: DataTypes.STRING(190), allowNull: true },
      payload: { type: DataTypes.JSONB, allowNull: false },
      status: { type: DataTypes.ENUM("new", "in_review", "contacted", "closed"), allowNull: false, defaultValue: "new" },
      assignedToId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      isSpam: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      spamReason: { type: DataTypes.STRING(60), allowNull: true },
      sourcePage: { type: DataTypes.STRING(255), allowNull: true },
      ip: { type: DataTypes.STRING(64), allowNull: true },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("form_submissions", ["type", "status"]);
    await queryInterface.addIndex("form_submissions", ["isSpam"]);
    await queryInterface.addIndex("form_submissions", ["email"]);
    await queryInterface.addIndex("form_submissions", ["createdAt"]);

    await queryInterface.createTable("submission_notes", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "form_submissions", key: "id" },
        onDelete: "CASCADE",
      },
      userId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
      authorName: { type: DataTypes.STRING(120), allowNull: true },
      body: { type: DataTypes.TEXT, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("submission_notes", ["submissionId"]);

    await queryInterface.createTable("newsletter_subscribers", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
      locale: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
      status: { type: DataTypes.ENUM("subscribed", "unsubscribed"), allowNull: false, defaultValue: "subscribed" },
      consentAt: { type: DataTypes.DATE, allowNull: true },
      unsubscribedAt: { type: DataTypes.DATE, allowNull: true },
      unsubscribeTokenHash: { type: DataTypes.STRING, allowNull: true },
      sourcePage: { type: DataTypes.STRING(255), allowNull: true },
      ip: { type: DataTypes.STRING(64), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("newsletter_subscribers", ["status"]);

    await queryInterface.createTable("notification_settings", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      formType: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      recipients: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      locale: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable("notification_settings");
    await queryInterface.dropTable("newsletter_subscribers");
    await queryInterface.dropTable("submission_notes");
    await queryInterface.dropTable("form_submissions");
    for (const type of ["enum_form_submissions_type", "enum_form_submissions_status", "enum_newsletter_subscribers_status"]) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${type}";`);
    }
  },
};
