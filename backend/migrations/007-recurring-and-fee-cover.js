const { DataTypes } = require("sequelize");

// Monthly (recurring) gifts and the optional "cover the processing fee" add-on.
//
// - donation_subscriptions: one row per monthly gift (Stripe subscription or
//   simulated), with a private manage token for the donor's self-service link.
// - donations: every charge stays a ledger row (one-time gift or one monthly
//   payment); it now records its frequency, its subscription and, when the
//   donor chose to cover the fee, how much of the amount is that add-on.
// - donation_events: can now belong to a subscription instead of a donation.
// - donation_settings: the switches and rates for both features.
module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable("donation_subscriptions", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // pending | active | past_due | canceled | incomplete
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
      provider: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "stripe" },
      providerSubscriptionId: { type: DataTypes.STRING(120), allowNull: true, unique: true },
      providerCustomerId: { type: DataTypes.STRING(120), allowNull: true },
      providerCheckoutSessionId: { type: DataTypes.STRING(120), allowNull: true },
      amountCents: { type: DataTypes.INTEGER, allowNull: false },
      feeCoverCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "usd" },
      interval: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "month" },
      donorName: { type: DataTypes.STRING(160), allowNull: false },
      donorEmail: { type: DataTypes.STRING(190), allowNull: false },
      locale: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
      anonymous: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      message: { type: DataTypes.TEXT, allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true },
      manageToken: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      currentPeriodEnd: { type: DataTypes.DATE, allowNull: true },
      cancelAtPeriodEnd: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      canceledAt: { type: DataTypes.DATE, allowNull: true },
      cancelReason: { type: DataTypes.STRING(160), allowNull: true },
      canceledBy: { type: DataTypes.STRING(120), allowNull: true },
      lastPaymentAt: { type: DataTypes.DATE, allowNull: true },
      paymentsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("donation_subscriptions", ["status"]);
    await queryInterface.addIndex("donation_subscriptions", ["donorEmail"]);

    await queryInterface.addColumn("donations", "frequency", { type: DataTypes.STRING(10), allowNull: false, defaultValue: "one_time" });
    await queryInterface.addColumn("donations", "subscriptionId", { type: DataTypes.INTEGER, allowNull: true, references: { model: "donation_subscriptions", key: "id" }, onDelete: "SET NULL" });
    await queryInterface.addColumn("donations", "providerInvoiceId", { type: DataTypes.STRING(120), allowNull: true });
    await queryInterface.addColumn("donations", "coverFees", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn("donations", "feeCoverCents", { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 });
    await queryInterface.addIndex("donations", ["subscriptionId"]);
    await queryInterface.addIndex("donations", ["providerInvoiceId"]);
    await queryInterface.addIndex("donations", ["frequency"]);

    await queryInterface.changeColumn("donation_events", "donationId", { type: DataTypes.INTEGER, allowNull: true });
    await queryInterface.addColumn("donation_events", "subscriptionId", { type: DataTypes.INTEGER, allowNull: true, references: { model: "donation_subscriptions", key: "id" }, onDelete: "CASCADE" });
    await queryInterface.addIndex("donation_events", ["subscriptionId", "createdAt"]);

    await queryInterface.addColumn("donation_settings", "monthlyEnabled", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });
    await queryInterface.addColumn("donation_settings", "monthlySuggestedAmounts", { type: DataTypes.JSONB, allowNull: false, defaultValue: [10, 25, 50, 100] });
    await queryInterface.addColumn("donation_settings", "feeCoverEnabled", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn("donation_settings", "feeCoverPercentBp", { type: DataTypes.INTEGER, allowNull: false, defaultValue: 290 });
    await queryInterface.addColumn("donation_settings", "feeCoverFixedCents", { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 });
    await queryInterface.addColumn("donation_settings", "feeCoverDefaultChecked", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
  },

  async down({ context: queryInterface }) {
    for (const col of ["monthlyEnabled", "monthlySuggestedAmounts", "feeCoverEnabled", "feeCoverPercentBp", "feeCoverFixedCents", "feeCoverDefaultChecked"]) {
      await queryInterface.removeColumn("donation_settings", col);
    }
    await queryInterface.removeColumn("donation_events", "subscriptionId");
    await queryInterface.changeColumn("donation_events", "donationId", { type: DataTypes.INTEGER, allowNull: false });
    for (const col of ["feeCoverCents", "coverFees", "providerInvoiceId", "subscriptionId", "frequency"]) {
      await queryInterface.removeColumn("donations", col);
    }
    await queryInterface.dropTable("donation_subscriptions");
  },
};
