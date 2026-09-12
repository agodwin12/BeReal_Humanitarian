const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Phase A
const User = require("./user.model")(sequelize, DataTypes);
const AuditLog = require("./auditLog.model")(sequelize, DataTypes);
// Phase B
const FormSubmission = require("./formSubmission.model")(sequelize, DataTypes);
const SubmissionNote = require("./submissionNote.model")(sequelize, DataTypes);
const NewsletterSubscriber = require("./newsletterSubscriber.model")(sequelize, DataTypes);
const NotificationSetting = require("./notificationSetting.model")(sequelize, DataTypes);
// Phase C
const { Media, SiteSetting, Program, TeamMember, ImpactMetric, ImpactStory, StewardshipUpdate, Page, PageVersion, LegalPage, LegalPageVersion } =
  require("./content.models")(sequelize, DataTypes);
// Phase D
const { TranslationReview, EmailLog } = require("./phaseD.models")(sequelize, DataTypes);
TranslationReview.belongsTo(User, { as: "reviewer", foreignKey: "reviewedById" });
// Phase E
const { DonationSetting, DonationSubscription, Donation, DonationEvent, StripeEvent, ReceiptSequence } = require("./donations.models")(sequelize, DataTypes);
Donation.hasMany(DonationEvent, { as: "events", foreignKey: "donationId", onDelete: "CASCADE" });
DonationEvent.belongsTo(Donation, { as: "donation", foreignKey: "donationId" });
DonationSubscription.hasMany(Donation, { as: "donations", foreignKey: "subscriptionId" });
Donation.belongsTo(DonationSubscription, { as: "subscription", foreignKey: "subscriptionId" });
DonationSubscription.hasMany(DonationEvent, { as: "events", foreignKey: "subscriptionId", onDelete: "CASCADE" });
DonationEvent.belongsTo(DonationSubscription, { as: "subscription", foreignKey: "subscriptionId" });

AuditLog.belongsTo(User, { as: "actor", foreignKey: "userId" });
User.hasMany(AuditLog, { as: "auditLogs", foreignKey: "userId" });
User.belongsTo(User, { as: "invitedBy", foreignKey: "invitedById" });

FormSubmission.belongsTo(User, { as: "assignee", foreignKey: "assignedToId" });
FormSubmission.hasMany(SubmissionNote, { as: "notes", foreignKey: "submissionId", onDelete: "CASCADE" });
SubmissionNote.belongsTo(FormSubmission, { as: "submission", foreignKey: "submissionId" });
SubmissionNote.belongsTo(User, { as: "author", foreignKey: "userId" });

Media.belongsTo(User, { as: "uploadedBy", foreignKey: "uploadedById" });
SiteSetting.belongsTo(Media, { as: "logo", foreignKey: "logoMediaId" });
SiteSetting.belongsTo(Media, { as: "favicon", foreignKey: "faviconMediaId" });
SiteSetting.belongsTo(Media, { as: "shareImage", foreignKey: "shareMediaId" });
Program.belongsTo(Media, { as: "cardMedia", foreignKey: "cardMediaId" });
Program.belongsTo(Media, { as: "detailMedia", foreignKey: "detailMediaId" });
TeamMember.belongsTo(Media, { as: "photo", foreignKey: "photoMediaId" });
ImpactStory.belongsTo(Media, { as: "media", foreignKey: "mediaId" });
Page.hasMany(PageVersion, { as: "versions", foreignKey: "pageId", onDelete: "CASCADE" });
PageVersion.belongsTo(User, { as: "createdBy", foreignKey: "createdById" });
LegalPage.hasMany(LegalPageVersion, { as: "versions", foreignKey: "legalPageId", onDelete: "CASCADE" });
LegalPageVersion.belongsTo(User, { as: "createdBy", foreignKey: "createdById" });

module.exports = {
  sequelize,
  User,
  AuditLog,
  FormSubmission,
  SubmissionNote,
  NewsletterSubscriber,
  NotificationSetting,
  Media,
  SiteSetting,
  Program,
  TeamMember,
  ImpactMetric,
  ImpactStory,
  StewardshipUpdate,
  Page,
  PageVersion,
  LegalPage,
  LegalPageVersion,
  TranslationReview,
  EmailLog,
  DonationSetting,
  DonationSubscription,
  Donation,
  DonationEvent,
  StripeEvent,
  ReceiptSequence,
};
