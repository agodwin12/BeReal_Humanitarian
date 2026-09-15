// Website AI assistant: settings (one row), visitor sessions and their messages.
module.exports = (sequelize, DataTypes) => {
  const localized = () => ({ type: DataTypes.JSONB, allowNull: false, defaultValue: {} });

  const ChatSetting = sequelize.define(
    "ChatSetting",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      assistantName: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "Be Real Assistant" },
      // { en, fr, es } texts shown as the first bubble.
      welcome: localized(),
      // { en: [..], fr: [..], es: [..] } chips under the welcome bubble.
      suggestedQuestions: localized(),
      // { en, fr, es } free text the organization wants the assistant to know
      // (opening hours, how to reach a chapter, current campaign…).
      extraKnowledge: localized(),
      maxMessagesPerSession: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
      updatedById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "chat_settings", timestamps: true },
  );

  const ChatSession = sequelize.define(
    "ChatSession",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      sessionKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      locale: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
      page: { type: DataTypes.STRING(200), allowNull: true },
      ipHash: { type: DataTypes.STRING(64), allowNull: true },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
      messageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lastMessageAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "chat_sessions", timestamps: true },
  );

  const ChatMessage = sequelize.define(
    "ChatMessage",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      sessionId: { type: DataTypes.INTEGER, allowNull: false },
      role: { type: DataTypes.STRING(10), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      model: { type: DataTypes.STRING(60), allowNull: true },
      latencyMs: { type: DataTypes.INTEGER, allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: "chat_messages", timestamps: true },
  );

  return { ChatSetting, ChatSession, ChatMessage };
};
