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

    app.listen(port, () => {
      console.log(`Be Real Humanitarian Works API (${nodeEnv}) listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Unable to start the server:", error);
    process.exit(1);
  }
}

start();
