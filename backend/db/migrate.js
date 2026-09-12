const path = require("path");
const { Umzug, SequelizeStorage } = require("umzug");
const sequelize = require("../config/database");

// Migration runner. `npm run migrate` / `npm run migrate:down` from the CLI;
// server.js also applies pending migrations at startup.
const umzug = new Umzug({
  migrations: { glob: path.join(__dirname, "..", "migrations", "*.js").replace(/\\/g, "/") },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: "schema_migrations" }),
  logger: console,
});

async function runMigrations() {
  const applied = await umzug.up();
  return applied.map((m) => m.name);
}

async function rollbackLast() {
  const reverted = await umzug.down();
  return reverted.map((m) => m.name);
}

module.exports = { umzug, runMigrations, rollbackLast };

if (require.main === module) {
  const command = process.argv[2] || "up";
  (async () => {
    try {
      await sequelize.authenticate();
      if (command === "up") {
        const names = await runMigrations();
        console.log(names.length ? `Applied: ${names.join(", ")}` : "Nothing to migrate.");
      } else if (command === "down") {
        const names = await rollbackLast();
        console.log(names.length ? `Reverted: ${names.join(", ")}` : "Nothing to revert.");
      } else if (command === "pending") {
        const pending = await umzug.pending();
        console.log(pending.length ? pending.map((m) => m.name).join("\n") : "No pending migrations.");
      } else {
        console.error(`Unknown command "${command}". Use up | down | pending.`);
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      await sequelize.close();
    }
  })();
}
