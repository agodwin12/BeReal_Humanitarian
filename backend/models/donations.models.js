const localized = (DataTypes) => ({ type: DataTypes.JSONB, allowNull: false, defaultValue: {} });

module.exports = (sequelize, DataTypes) => {
  const DonationSetting = sequelize.define(
    "DonationSetting",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "usd" },
      suggestedAmounts: { type: DataTypes.JSONB, allowNull: false, defaultValue: [25, 50, 100, 250] },
      minimumAmountCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 500 },
      maximumAmountCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2500000 },
      // Monthly gifts (Stripe subscriptions) — on/off and their own amount chips.
      monthlyEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      monthlySuggestedAmounts: { type: DataTypes.JSONB, allowNull: false, defaultValue: [10, 25, 50, 100] },
      // Optional "add the processing fee" checkbox on the Donate form. Off = the
      // organization absorbs the fee (the launch wording). Rate in basis points.
      feeCoverEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      feeCoverPercentBp: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 290 },
      feeCoverFixedCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
      feeCoverDefaultChecked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      thankYouMessage: localized(DataTypes),
      receiptIntro: localized(DataTypes),
      receiptIrsStatement: localized(DataTypes),
      receiptSignoff: localized(DataTypes),
      receiptSenderName: { type: DataTypes.STRING(120), allowNull: true },
      receiptReplyTo: { type: DataTypes.STRING(190), allowNull: true },
      statementDescriptor: { type: DataTypes.STRING(22), allowNull: true },
      updatedById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "donation_settings", timestamps: true },
  );

  // One monthly gift = one row here; every charge it produces is a Donation.
  const DonationSubscription = sequelize.define(
    "DonationSubscription",
    {
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
      // Private token in the donor's "manage my monthly gift" link.
      manageToken: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      currentPeriodEnd: { type: DataTypes.DATE, allowNull: true },
      cancelAtPeriodEnd: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      canceledAt: { type: DataTypes.DATE, allowNull: true },
      cancelReason: { type: DataTypes.STRING(160), allowNull: true },
      canceledBy: { type: DataTypes.STRING(120), allowNull: true },
      lastPaymentAt: { type: DataTypes.DATE, allowNull: true },
      paymentsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: "donation_subscriptions", timestamps: true },
  );

  // The ledger. Stripe keeps the money and the card; this row keeps who gave
  // what, when, in which language, and which receipt they received.
  const Donation = sequelize.define(
    "Donation",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      receiptNumber: { type: DataTypes.STRING(30), allowNull: true, unique: true },
      // pending | paid | failed | expired | refunded | partially_refunded
      status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "pending" },
      // stripe | simulated (local review without keys)
      provider: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "stripe" },
      providerSessionId: { type: DataTypes.STRING(120), allowNull: true, unique: true },
      providerPaymentIntentId: { type: DataTypes.STRING(120), allowNull: true },
      providerChargeId: { type: DataTypes.STRING(120), allowNull: true },
      providerInvoiceId: { type: DataTypes.STRING(120), allowNull: true },
      // one_time | monthly (one row per monthly payment, linked to its subscription)
      frequency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "one_time" },
      subscriptionId: { type: DataTypes.INTEGER, allowNull: true },
      // amountCents is what the donor paid in total; feeCoverCents is the part
      // they chose to add for the processing fee (0 unless they ticked the box).
      amountCents: { type: DataTypes.INTEGER, allowNull: false },
      coverFees: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      feeCoverCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
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
    },
    { tableName: "donations", timestamps: true },
  );

  Donation.prototype.netCents = function netCents() {
    return this.amountCents - (this.feeCents || 0) - (this.refundedCents || 0);
  };

  // Timeline entries: on a donation, or on a subscription (payment failed, canceled…).
  const DonationEvent = sequelize.define(
    "DonationEvent",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      donationId: { type: DataTypes.INTEGER, allowNull: true },
      subscriptionId: { type: DataTypes.INTEGER, allowNull: true },
      type: { type: DataTypes.STRING(40), allowNull: false },
      data: { type: DataTypes.JSONB, allowNull: true },
      actorName: { type: DataTypes.STRING(120), allowNull: true },
    },
    { tableName: "donation_events", timestamps: true, updatedAt: false },
  );

  const StripeEvent = sequelize.define(
    "StripeEvent",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      eventId: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      type: { type: DataTypes.STRING(80), allowNull: false },
      livemode: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      processed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      donationId: { type: DataTypes.INTEGER, allowNull: true },
      summary: { type: DataTypes.JSONB, allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: "stripe_events", timestamps: true, updatedAt: false },
  );

  const ReceiptSequence = sequelize.define(
    "ReceiptSequence",
    {
      year: { type: DataTypes.INTEGER, primaryKey: true },
      last: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: "receipt_sequences", timestamps: false },
  );

  return { DonationSetting, DonationSubscription, Donation, DonationEvent, StripeEvent, ReceiptSequence };
};
