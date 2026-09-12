module.exports = (sequelize, DataTypes) => {
  const SubmissionNote = sequelize.define(
    "SubmissionNote",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      authorName: { type: DataTypes.STRING(120), allowNull: true },
      body: { type: DataTypes.TEXT, allowNull: false },
    },
    { tableName: "submission_notes", timestamps: true, updatedAt: false },
  );

  return SubmissionNote;
};
