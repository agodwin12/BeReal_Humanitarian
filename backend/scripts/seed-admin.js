// Creates the first Super Admin from SEED_ADMIN_* env vars (idempotent).
//   npm run seed:admin
const bcrypt = require("bcryptjs");

const { seedAdmin } = require("../config/env");
const { sequelize, User } = require("../models");

(async () => {
  try {
    if (!seedAdmin.email || !seedAdmin.password) {
      throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first");
    }
    if (seedAdmin.password.length < 10) {
      throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters");
    }

    await sequelize.authenticate();

    const existing = await User.findOne({ where: { email: seedAdmin.email.toLowerCase() } });
    if (existing) {
      console.log(`Super Admin already exists: ${existing.email} (status: ${existing.status})`);
      return;
    }

    const user = await User.create({
      name: seedAdmin.name,
      email: seedAdmin.email,
      passwordHash: await bcrypt.hash(seedAdmin.password, 12),
      role: "super_admin",
      status: "active",
    });
    console.log(`Super Admin created: ${user.email}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
