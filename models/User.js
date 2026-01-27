/**
 * User Model - MongoDB Schema for User Data
 * Stores user information and device tokens for push notifications
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Firebase UID (primary identifier)
  firebaseUid: {
    type: String,
    required: [true, 'Firebase UID is required'],
    unique: true,
    index: true,
    trim: true
  },

  // Email address
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        // Basic email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },

  // Display name
  displayName: {
    type: String,
    trim: true,
    maxlength: [100, 'Display name cannot exceed 100 characters']
  },

  // Phone number (optional)
  phoneNumber: {
    type: String,
    trim: true,
    default: null
  },

  // Profile photo URL (optional)
  photoURL: {
    type: String,
    trim: true,
    default: null
  },

  // Device tokens for push notifications (FCM)
  deviceTokens: [{
    type: String,
    trim: true
  }],

  // Notification preferences
  notificationsEnabled: {
    type: Boolean,
    default: true
  },

  // Email notifications preference
  emailNotificationsEnabled: {
    type: Boolean,
    default: true
  },

  // User role (for future role-based access control)
  role: {
    type: String,
    enum: ['user', 'admin', 'advocate'],
    default: 'user'
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },

  // Email verification status
  emailVerified: {
    type: Boolean,
    default: false
  },

  // Last login timestamp
  lastLogin: {
    type: Date,
    default: Date.now
  },

  // User preferences
  preferences: {
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'gu'] // English, Hindi, Gujarati
    },
    reminderTime: {
      type: String,
      default: '09:00', // 24-hour format
      validate: {
        validator: function(time) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
        },
        message: 'Invalid time format. Use HH:MM (24-hour format)'
      }
    }
  },

  // Subscription info (for future premium features)
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date
  },

  // Additional metadata
  metadata: {
    type: Map,
    of: String,
    default: {}
  }

}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== INDEXES ====================

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ firebaseUid: 1 });
userSchema.index({ isActive: 1 });

// ==================== VIRTUALS ====================

// Get total device count
userSchema.virtual('deviceCount').get(function() {
  return this.deviceTokens ? this.deviceTokens.length : 0;
});

// Check if user is premium
userSchema.virtual('isPremium').get(function() {
  return this.subscription && 
         this.subscription.plan !== 'free' &&
         this.subscription.endDate &&
         this.subscription.endDate > new Date();
});

// ==================== METHODS ====================

// Instance method to add device token
userSchema.methods.addDeviceToken = async function(token) {
  if (!token || token.trim() === '') {
    throw new Error('Invalid device token');
  }

  // Check if token already exists
  if (!this.deviceTokens.includes(token)) {
    this.deviceTokens.push(token);
    await this.save();
    console.log(`✅ Device token added for user: ${this.email}`);
  } else {
    console.log(`⚠️  Device token already exists for user: ${this.email}`);
  }

  return this;
};

// Instance method to remove device token
userSchema.methods.removeDeviceToken = async function(token) {
  const index = this.deviceTokens.indexOf(token);
  
  if (index > -1) {
    this.deviceTokens.splice(index, 1);
    await this.save();
    console.log(`🗑️  Device token removed for user: ${this.email}`);
  }

  return this;
};

// Instance method to clear all device tokens
userSchema.methods.clearAllDeviceTokens = async function() {
  this.deviceTokens = [];
  await this.save();
  console.log(`🗑️  All device tokens cleared for user: ${this.email}`);
  return this;
};

// Update last login timestamp
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save();
};

// ==================== STATIC METHODS ====================

// Find or create user from Firebase auth
userSchema.statics.findOrCreateFromFirebase = async function(firebaseUser) {
  try {
    // Try to find existing user
    let user = await this.findOne({ firebaseUid: firebaseUser.uid });

    if (user) {
      // Update last login
      user.lastLogin = new Date();
      user.emailVerified = firebaseUser.emailVerified || false;
      await user.save();
      console.log(`✅ Existing user logged in: ${user.email}`);
      return user;
    }

    // Create new user if not found
    user = await this.create({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
      phoneNumber: firebaseUser.phoneNumber || null,
      photoURL: firebaseUser.photoURL || null,
      emailVerified: firebaseUser.emailVerified || false,
      lastLogin: new Date()
    });

    console.log(`✅ New user created: ${user.email}`);
    return user;

  } catch (error) {
    console.error('Error in findOrCreateFromFirebase:', error);
    throw error;
  }
};

// Find users who need reminders (have notifications enabled)
userSchema.statics.findUsersForNotifications = async function(userIds) {
  return await this.find({
    firebaseUid: { $in: userIds },
    notificationsEnabled: true,
    isActive: true
  }).select('firebaseUid email deviceTokens notificationsEnabled');
};

// ==================== MIDDLEWARE ====================

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Remove duplicate device tokens
  if (this.deviceTokens && this.deviceTokens.length > 0) {
    this.deviceTokens = [...new Set(this.deviceTokens)];
  }
  next();
});

// Post-save middleware (for logging)
userSchema.post('save', function(doc) {
  console.log(`👤 User data saved: ${doc.email} (UID: ${doc.firebaseUid})`);
});

// ==================== EXPORT MODEL ====================

module.exports = mongoose.model('User', userSchema);