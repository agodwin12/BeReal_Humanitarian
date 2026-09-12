const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");

const { clientUrls, nodeEnv } = require("./config/env");
const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler.middleware");
const { fail } = require("./utils/apiResponse");

const app = express();

app.set("trust proxy", 1);
// Images are embedded by the public site on another origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin tools (curl, health checks) send no Origin header.
      if (!origin || clientUrls.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(cookieParser());
// Stripe signs the raw request body: this route must see it before JSON parsing.
app.post("/api/donations/webhook", express.raw({ type: "application/json", limit: "2mb" }), require("./controllers/donationsWebhook.controller"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
if (nodeEnv !== "test") app.use(morgan(nodeEnv === "production" ? "combined" : "dev"));

app.get("/health", (req, res) =>
  res.json({ success: true, service: "be-real-humanitarian-api", env: nodeEnv, time: new Date().toISOString() }),
);

// Local media driver (until Cloudflare R2 keys are set): files uploaded via the
// media library are served from here with long cache headers.
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "365d", immutable: true, index: false }));

app.use("/api", routes);

app.use((req, res) => fail(res, 404, "Route not found"));
app.use(errorHandler);

module.exports = app;
