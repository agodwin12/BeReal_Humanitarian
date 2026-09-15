const { DataTypes } = require("sequelize");

// Website AI assistant (Gemini). Three tables:
// - chat_settings: the single row of switches and texts edited in the portal
//   (on/off, assistant name, welcome message, suggested questions, extra
//   knowledge the organization wants the assistant to know).
// - chat_sessions: one row per visitor conversation (anonymous key, locale,
//   page it started on, hashed IP), so staff can read what people ask.
// - chat_messages: the turns of each conversation, with the model used and
//   the error when the assistant could not answer.
module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable("chat_settings", {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      assistantName: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "Be Real Assistant" },
      welcome: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      suggestedQuestions: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      extraKnowledge: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      maxMessagesPerSession: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
      updatedById: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable("chat_sessions", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      sessionKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      locale: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
      page: { type: DataTypes.STRING(200), allowNull: true },
      ipHash: { type: DataTypes.STRING(64), allowNull: true },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
      messageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lastMessageAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("chat_sessions", ["lastMessageAt"]);

    await queryInterface.createTable("chat_messages", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      sessionId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "chat_sessions", key: "id" }, onDelete: "CASCADE" },
      // user | assistant
      role: { type: DataTypes.STRING(10), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      model: { type: DataTypes.STRING(60), allowNull: true },
      latencyMs: { type: DataTypes.INTEGER, allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("chat_messages", ["sessionId"]);
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable("chat_messages");
    await queryInterface.dropTable("chat_sessions");
    await queryInterface.dropTable("chat_settings");
  },
};
