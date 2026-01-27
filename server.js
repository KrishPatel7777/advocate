/**
 * Server.js - Main Entry Point for Advocate Reminder Backend
 * Handles Express server setup, MongoDB connection, and route initialization
 */

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

// ==================== INITIALIZE EXPRESS APP ====================
const app = express();

// ==================== STATIC FILES ====================
app.use(express.static(path.join(__dirname, "static")));

// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet());

const corsOptions = {
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// ==================== RATE LIMITING ====================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// ==================== BODY PARSER ====================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ==================== REQUEST LOGGER ====================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== MONGODB CONNECTION ====================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log("========================================");
    console.log("✅ MongoDB Connected");
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`📂 DB: ${conn.connection.name}`);
    console.log("========================================");

    const { initializeReminderCron } = require("./cron/reminderCron");
    initializeReminderCron();
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};
connectDB();

mongoose.connection.on("error", (err) =>
  console.error("❌ MongoDB error:", err)
);
mongoose.connection.on("disconnected", () =>
  console.log("⚠️ MongoDB disconnected")
);
mongoose.connection.on("reconnected", () =>
  console.log("✅ MongoDB reconnected")
);

// ==================== ROUTES ====================
const caseRoutes = require("./routes/caseRoutes");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "dashboard.html"));
});

// ==================== API ROUTES ====================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/cases", caseRoutes);

app.get("/api/test-reminder", async (req, res) => {
  try {
    const { manualTriggerReminders } = require("./cron/reminderCron");
    const result = await manualTriggerReminders();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    name: "Advocate Reminder API",
    version: "1.0.0",
  });
});

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log("========================================");
  console.log("🚀 Server Started");
  console.log(`🌐 Port: ${PORT}`);
  console.log("========================================");
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("unhandledRejection", shutdown);

function shutdown(err) {
  if (err) console.error("❌ Shutdown error:", err);
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("🛑 Server & MongoDB closed");
      process.exit(0);
    });
  });
}

module.exports = app;
