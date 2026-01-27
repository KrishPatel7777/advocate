/**
 * Server.js - Main Entry Point for Advocate Reminder Backend
 * Handles Express server setup, MongoDB connection, and route initialization
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// ==================== STATIC FILES ====================
app.use(express.static(path.join(__dirname, "static")));

// ==================== INITIALIZE EXPRESS APP ====================
const app = express();

// ==================== SECURITY MIDDLEWARE ====================

// Helmet - Secure HTTP headers
app.use(helmet());

// CORS Configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate Limiting - Prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to API routes only
app.use('/api/', limiter);

// ==================== BODY PARSER MIDDLEWARE ====================

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== REQUEST LOGGING MIDDLEWARE ====================

// Simple request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ==================== MONGODB CONNECTION ====================

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('========================================');
    console.log('✅ MongoDB Connected Successfully');
    console.log('========================================');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`📂 Database: ${conn.connection.name}`);
    console.log('========================================');

    // Initialize cron job after successful DB connection
    const { initializeReminderCron } = require('./cron/reminderCron');
    initializeReminderCron();

  } catch (error) {
    console.error('========================================');
    console.error('❌ MongoDB Connection Error');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error('========================================');
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// ==================== IMPORT ROUTES ====================

const caseRoutes = require('./routes/caseRoutes');

app.use(express.static(path.join(__dirname, "static")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "dashboard.html"));
});


// ==================== API ROUTES ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Case management routes
app.use('/api/cases', caseRoutes);

// User management routes (optional - for future implementation)
// app.use('/api/users', userRoutes);

// Manual reminder trigger (for testing only - remove in production)
app.get('/api/test-reminder', async (req, res) => {
  try {
    const { manualTriggerReminders } = require('./cron/reminderCron');
    const result = await manualTriggerReminders();
    res.status(200).json({
      success: true,
      message: 'Reminder check completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Reminder check failed',
      error: error.message
    });
  }
});

// API documentation endpoint (basic)
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Advocate Reminder API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      cases: '/api/cases',
      testReminder: '/api/test-reminder'
    },
    documentation: 'See README.md for full API documentation'
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler - Route not found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('========================================');
  console.error('❌ Error occurred:');
  console.error('========================================');
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('========================================');

  // Don't leak error details in production
  const errorResponse = {
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error'
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = err.message;
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

// ==================== GRACEFUL SHUTDOWN ====================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('========================================');
  console.error('❌ UNHANDLED PROMISE REJECTION');
  console.error('========================================');
  console.error('Error:', err);
  console.error('========================================');
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle SIGTERM signal
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n👋 SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 SERVER STARTED SUCCESSFULLY');
  console.log('='.repeat(50));
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`⏰ Server Time: ${new Date().toLocaleString()}`);
  console.log('='.repeat(50) + '\n');
});

// Export app for testing
module.exports = app;