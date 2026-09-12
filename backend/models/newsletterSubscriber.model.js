module.exports = (sequelize, DataTypes) => {
  const NewsletterSubscriber = sequelize.define(
    "NewsletterSubscriber",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      email: {
        type: DataTypes.STRING(190),
        allowNull: false,
        unique: true,
        set(value) {
          this.setDataValue("email", String(value).trim().toLowerCase());
        },
      },
      locale: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
      status: { type: DataTypes.ENUM("subscribed", "unsubscribed"), allowNull: false, defaultValue: "subscribed" },
      consentAt: { type: DataTypes.DATE, allowNull: true },
      unsubscribedAt: { type: DataTypes.DATE, allowNull: true },
      // Raw token lives only in the unsubscribe link; the hash is stored.
      unsubscribeTokenHash: { type: DataTypes.STRING, allowNull: true },
      sourcePage: { type: DataTypes.STRING(255), allowNull: true },
      ip: { type: DataTypes.STRING(64), allowNull: true },
    },
    { tableName: "newsletter_subscribers", timestamps: true },
  );

  NewsletterSubscriber.prototype.toSafeJSON = function toSafeJSON() {
    const { id, email, locale, status, consentAt, unsubscribedAt, sourcePage, createdAt, updatedAt } = this.get();
    return { id, email, locale, status, consentAt, unsubscribedAt, sourcePage, createdAt, updatedAt };
  };

  return NewsletterSubscriber;
};
