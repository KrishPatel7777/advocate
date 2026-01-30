// ========================================
// MONGODB DATABASE CONNECTION
// Path: /backend/config/db.js
// ========================================

const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * @returns {Promise} - MongoDB connection promise
 */
const connectDB = async () => {
    try {
        // MongoDB connection options
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        };

        // Get MongoDB URI from environment variable
        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        // Connect to MongoDB
        const conn = await mongoose.connect(MONGODB_URI, options);

        console.log('========================================');
        console.log('✅ MongoDB Connected Successfully');
        console.log('========================================');
        console.log(`📍 Host: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        console.log(`🔌 Port: ${conn.connection.port || 'default'}`);
        console.log(`⚡ Ready State: ${getReadyState(conn.connection.readyState)}`);
        console.log('========================================');

        return conn;

    } catch (error) {
        console.error('========================================');
        console.error('❌ MongoDB Connection Failed');
        console.error('========================================');
        console.error('Error:', error.message);
        console.error('========================================');
        
        // Exit process with failure
        process.exit(1);
    }
};
module.exports = connectDB;

/**
 * Get human-readable connection state
 * @param {number} state - Mongoose connection state
 * @returns {string} - Readable state
 */
const getReadyState = (state) => {
    const states = {
        0: 'Disconnected',
        1: 'Connected',
        2: 'Connecting',
        3: 'Disconnecting',
        99: 'Uninitialized'
    };
    return states[state] || 'Unknown';
};

/**
 * MongoDB connection event listeners
 */
const setupConnectionListeners = () => {
    // Connection successful
    mongoose.connection.on('connected', () => {
        console.log('🟢 MongoDB: Connection established');
    });

    // Connection error
    mongoose.connection.on('error', (error) => {
        console.error('🔴 MongoDB Error:', error.message);
    });

    // Connection disconnected
    mongoose.connection.on('disconnected', () => {
        console.warn('🟡 MongoDB: Connection disconnected');
    });

    // Connection reconnected
    mongoose.connection.on('reconnected', () => {
        console.log('🟢 MongoDB: Connection re-established');
    });

    // Application termination
    process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('🔴 MongoDB: Connection closed due to app termination');
        process.exit(0);
    });
};

/**
 * Disconnect from MongoDB
 * @returns {Promise} - Disconnection promise
 */
const disconnectDB = async () => {
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB: Disconnected successfully');
    } catch (error) {
        console.error('❌ MongoDB: Disconnection error:', error.message);
        throw error;
    }
};

/**
 * Check if database is connected
 * @returns {boolean} - Connection status
 */
const isConnected = () => {
    return mongoose.connection.readyState === 1;
};

/**
 * Get current database connection info
 * @returns {object} - Connection information
 */
const getConnectionInfo = () => {
    if (!isConnected()) {
        return {
            connected: false,
            message: 'Database not connected'
        };
    }

    return {
        connected: true,
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        port: mongoose.connection.port || 'default',
        readyState: getReadyState(mongoose.connection.readyState)
    };
};

// Setup connection event listeners
setupConnectionListeners();

// Export functions
module.exports = {
    connectDB,
    disconnectDB,
    isConnected,
    getConnectionInfo,
    getReadyState
};