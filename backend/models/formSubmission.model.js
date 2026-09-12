module.exports = (sequelize, DataTypes) => {
  const FormSubmission = sequelize.define(
    "FormSubmission",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      type: { type: DataTypes.ENUM("volunteer", "partnership", "assistance", "contact"), allowNull: false },
      locale: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
      // Denormalized from the payload for lists, search and notifications.
      name: { type: DataTypes.STRING(160), allowNull: true },
      email: { type: DataTypes.STRING(190), allowNull: true },
      payload: { type: DataTypes.JSONB, allowNull: false },
      status: { type: DataTypes.ENUM("new", "in_review", "contacted", "closed"), allowNull: false, defaultValue: "new" },
      assignedToId: { type: DataTypes.INTEGER, allowNull: true },
      // Quarantine: kept for review instead of silently dropped.
      isSpam: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      spamReason: { type: DataTypes.STRING(60), allowNull: true },
      sourcePage: { type: DataTypes.STRING(255), allowNull: true },
      ip: { type: DataTypes.STRING(64), allowNull: true },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: "form_submissions", timestamps: true },
  );

  return FormSubmission;
};
