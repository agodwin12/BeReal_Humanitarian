const { Sequelize } = require("sequelize");
const { db, isProd } = require("./env");

const common = {
  dialect: "postgres",
  logging: false,
  define: { underscored: false },
  dialectOptions: db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  pool: { max: isProd ? 10 : 5, min: 0, idle: 10_000 },
};

const sequelize = db.url
  ? new Sequelize(db.url, common)
  : new Sequelize(db.name, db.user, db.password, { ...common, host: db.host, port: db.port });

module.exports = sequelize;
