module.exports = (sequelize, DataTypes) => {
  // "Reviewed by a native speaker" for one field in one language. The hash of
  // the reviewed text makes the mark expire automatically when the text changes.
  const TranslationReview = sequelize.define(
    "TranslationReview",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      fieldId: { type: DataTypes.STRING(220), allowNull: false },
      locale: { type: DataTypes.STRING(5), allowNull: false },
      textHash: { type: DataTypes.STRING(64), allowNull: false },
      reviewedById: { type: DataTypes.INTEGER, allowNull: true },
      reviewedBy: { type: DataTypes.STRING(120), allowNull: true },
      reviewedAt: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: "translation_reviews", timestamps: true },
  );

  const EmailLog = sequelize.define(
    "EmailLog",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      to: { type: DataTypes.STRING(500), allowNull: false },
      subject: { type: DataTypes.STRING(300), allowNull: false },
      kind: { type: DataTypes.STRING(60), allowNull: true },
      // sent | failed | console (no provider key: printed to the API log)
      status: { type: DataTypes.STRING(20), allowNull: false },
      providerId: { type: DataTypes.STRING(120), allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: "email_logs", timestamps: true, updatedAt: false },
  );

  return { TranslationReview, EmailLog };
};
