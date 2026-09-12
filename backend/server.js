const app = require("./app");
const sequelize = require("./config/database");
const { port, nodeEnv } = require("./config/env");
const { runMigrations } = require("./db/migrate");
const { ensureDefaults } = require("./services/notifications.service");
const { ensureContentDefaults } = require("./services/content.seed");

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established.");

    const applied = await runMigrations();
    if (applied.length) console.log(`Applied migrations: ${applied.join(", ")}`);

    await ensureDefaults();
    await ensureContentDefaults();
    await require("./services/donations.service").ensureDonationDefaults();

    // HOST=127.0.0.1 on a server behind nginx keeps the API off the public interface.
    const host = process.env.HOST || undefined;
    app.listen(port, host, () => {
      console.log(`Be Real Humanitarian Works API (${nodeEnv}) listening on http://${host || "localhost"}:${port}`);
    });
  } catch (error) {
    console.error("Unable to start the server:", error);
    process.exit(1);
  }
}

start();
