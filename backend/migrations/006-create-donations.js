const { DataTypes } = require("sequelize");

const timestamps = {
  createdAt: { type: DataTypes.DATE, allowNull: false },
  updatedAt: { type: DataTypes.DATE, allowNull: false },
};
const localized = () => ({ type: DataTypes.JSONB, allowNull: false, defaultValue: {} });

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable("donation_settings", {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "usd" },
      suggestedAmounts: { type: DataTypes.JSONB, allowNull: false, defaultValue: [25, 50, 100, 250] },
      minimumAmountCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 500 },
      maximumAmountCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2500000 },
      thankYouMessage: localized(),
      receiptIntro: localized(),
      receiptIrsStatement: localized(),
      receiptSignoff: localized(),
      receiptSenderName: { type: DataTypes.STRING(120), allowNull: true },
      receiptReplyTo: { type: DataTypes.STRING(190), allowNull: true },
      statementDescriptor: { type: DataTypes.STRING(22), allowNull: true },
      updatedById: { type: DataTypes.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
      ...timestamps,
    });

    await queryInterface.createTable("donations", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      receiptNumber: { type: DataTypes.STRING(30), allowNull: true, unique: true },
      status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "pending" },
      provider: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "stripe" },
      providerSessionId: { type: DataTypes.STRING(120), allowNull: true, unique: true },
      providerPaymentIntentId: { type: DataTypes.STRING(120), allowNull: true },
      providerChargeId: { type: DataTypes.STRING(120), allowNull: true },
      amountCents: { type: DataTypes.INTEGER, allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "usd" },
      feeCents: { type: DataTypes.INTEGER, allowNull: true },
      refundedCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      donorName: { type: DataTypes.STRING(160), allowNull: false },
      donorEmail: { type: DataTypes.STRING(190), allowNull: false },
      locale: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
      anonymous: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      message: { type: DataTypes.TEXT, allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true },
      sourcePage: { type: DataTypes.STRING(255), allowNull: true },
      ip: { type: DataTypes.STRING(64), allowNull: true },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
      paidAt: { type: DataTypes.DATE, allowNull: true },
      refundedAt: { type: DataTypes.DATE, allowNull: true },
      receiptSentAt: { type: DataTypes.DATE, allowNull: true },
      receiptSendCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ...timestamps,
    });
    await queryInterface.addIndex("donations", ["status"]);
    await queryInterface.addIndex("donations", ["donorEmail"]);
    await queryInterface.addIndex("donations", ["paidAt"]);
    await queryInterface.addIndex("donations", ["createdAt"]);

    await queryInterface.createTable("donation_events", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      donationId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "donations", key: "id" }, onDelete: "CASCADE" },
      type: { type: DataTypes.STRING(40), allowNull: false },
      data: { type: DataTypes.JSONB, allowNull: true },
      actorName: { type: DataTypes.STRING(120), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("donation_events", ["donationId", "createdAt"]);

    await queryInterface.createTable("stripe_events", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      eventId: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      type: { type: DataTypes.STRING(80), allowNull: false },
      livemode: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      processed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      donationId: { type: DataTypes.INTEGER, allowNull: true },
      summary: { type: DataTypes.JSONB, allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("stripe_events", ["createdAt"]);

    // Receipt numbers restart each fiscal year (Jan 1 – Dec 31): BRHW-2026-00001.
    await queryInterface.createTable("receipt_sequences", {
      year: { type: DataTypes.INTEGER, primaryKey: true },
      last: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    });
  },

  async down({ context: queryInterface }) {
    for (const table of ["receipt_sequences", "stripe_events", "donation_events", "donations", "donation_settings"]) {
      await queryInterface.dropTable(table);
    }
  },
};
