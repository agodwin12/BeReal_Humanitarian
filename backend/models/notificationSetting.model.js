module.exports = (sequelize, DataTypes) => {
  const NotificationSetting = sequelize.define(
    "NotificationSetting",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // volunteer | partnership | assistance | contact | newsletter
      formType: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      // Staff emails alerted for this form type.
      recipients: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      // Language of the staff alert.
      locale: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "notification_settings", timestamps: true },
  );

  return NotificationSetting;
};
