// ========================================
// CASE MODEL - MongoDB Schema
// Path: /backend/models/Case.js
// ========================================

const mongoose = require('mongoose');

/**
 * Case Schema Definition
 * Defines the structure for storing legal case data
 */
const caseSchema = new mongoose.Schema(
    {
        // User ID from Firebase Authentication
        userId: {
            type: String,
            required: [true, 'User ID is required'],
            index: true, // Index for faster queries
            trim: true
        },

        // Client/Party Name
        clientName: {
            type: String,
            required: [true, 'Client name is required'],
            trim: true,
            minlength: [2, 'Client name must be at least 2 characters'],
            maxlength: [200, 'Client name cannot exceed 200 characters']
        },

        // Case Title/Name
        caseTitle: {
            type: String,
            required: [true, 'Case title is required'],
            trim: true,
            minlength: [3, 'Case title must be at least 3 characters'],
            maxlength: [300, 'Case title cannot exceed 300 characters']
        },

        // Case Description
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
            minlength: [10, 'Description must be at least 10 characters'],
            maxlength: [2000, 'Description cannot exceed 2000 characters']
        },

        // Due Date (Hearing date, filing deadline, etc.)
        dueDate: {
            type: Date,
            required: [true, 'Due date is required'],
            validate: {
                validator: function(value) {
                    // Due date should be in the future (optional - can be removed if past dates allowed)
                    // return value >= new Date();
                    return true; // Allow any date
                },
                message: 'Due date must be in the future'
            }
        },

        // Reminder Status
        reminderSent: {
            type: Boolean,
            default: false,
            index: true // Index for faster reminder queries
        },

        // Date when reminder was sent
        reminderSentAt: {
            type: Date,
            default: null
        },

        // Case Completion Status
        completed: {
            type: Boolean,
            default: false,
            index: true
        },

        // Date when case was marked as completed
        completedAt: {
            type: Date,
            default: null
        },

        // Case Priority (optional)
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
            lowercase: true
        },

        // Case Status (optional)
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'cancelled'],
            default: 'pending',
            lowercase: true
        },

        // Additional Notes (optional)
        notes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Notes cannot exceed 1000 characters'],
            default: ''
        },

        // Court/Location (optional)
        court: {
            type: String,
            trim: true,
            maxlength: [200, 'Court name cannot exceed 200 characters'],
            default: ''
        },

        // Case Number (optional)
        caseNumber: {
            type: String,
            trim: true,
            maxlength: [100, 'Case number cannot exceed 100 characters'],
            default: ''
        },

        // Attachments/Documents URLs (optional)
        attachments: [{
            name: String,
            url: String,
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }],

        // Tags for categorization (optional)
        tags: [{
            type: String,
            trim: true,
            lowercase: true
        }]
    },
    {
        // Automatic timestamps (createdAt, updatedAt)
        timestamps: true,
        
        // Collection name
        collection: 'cases'
    }
);

// ========================================
// INDEXES
// ========================================

// Compound index for user-specific queries
caseSchema.index({ userId: 1, dueDate: 1 });
caseSchema.index({ userId: 1, completed: 1 });
caseSchema.index({ userId: 1, reminderSent: 1 });

// Text index for search functionality
caseSchema.index({ 
    clientName: 'text', 
    caseTitle: 'text', 
    description: 'text',
    caseNumber: 'text'
});

// ========================================
// VIRTUAL PROPERTIES
// ========================================

// Calculate days until due date
caseSchema.virtual('daysUntilDue').get(function() {
    if (!this.dueDate) return null;
    
    const today = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
});

// Check if case is overdue
caseSchema.virtual('isOverdue').get(function() {
    if (!this.dueDate || this.completed) return false;
    return new Date(this.dueDate) < new Date();
});

// Check if reminder should be sent (2 days before due date)
caseSchema.virtual('shouldSendReminder').get(function() {
    if (this.reminderSent || this.completed) return false;
    
    const daysUntilDue = this.daysUntilDue;
    return daysUntilDue !== null && daysUntilDue <= 2 && daysUntilDue >= 0;
});

// ========================================
// INSTANCE METHODS
// ========================================

/**
 * Mark case as completed
 */
caseSchema.methods.markAsCompleted = function() {
    this.completed = true;
    this.completedAt = new Date();
    this.status = 'completed';
    return this.save();
};

/**
 * Mark reminder as sent
 */
caseSchema.methods.markReminderSent = function() {
    this.reminderSent = true;
    this.reminderSentAt = new Date();
    return this.save();
};

/**
 * Reset reminder status (useful for testing)
 */
caseSchema.methods.resetReminder = function() {
    this.reminderSent = false;
    this.reminderSentAt = null;
    return this.save();
};

// ========================================
// STATIC METHODS
// ========================================

/**
 * Find cases that need reminders (2 days before due date)
 * @returns {Promise<Array>} - Cases needing reminders
 */
caseSchema.statics.findCasesNeedingReminders = function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);
    
    return this.find({
        dueDate: {
            $gte: today,
            $lte: twoDaysFromNow
        },
        reminderSent: false,
        completed: false
    }).exec();
};

/**
 * Find user's upcoming cases
 * @param {string} userId - Firebase user ID
 * @returns {Promise<Array>} - Upcoming cases
 */
caseSchema.statics.findUpcomingCases = function(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.find({
        userId,
        dueDate: { $gte: today },
        completed: false
    })
    .sort({ dueDate: 1 })
    .exec();
};

/**
 * Find user's overdue cases
 * @param {string} userId - Firebase user ID
 * @returns {Promise<Array>} - Overdue cases
 */
caseSchema.statics.findOverdueCases = function(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.find({
        userId,
        dueDate: { $lt: today },
        completed: false
    })
    .sort({ dueDate: -1 })
    .exec();
};

/**
 * Search cases by text
 * @param {string} userId - Firebase user ID
 * @param {string} searchText - Search query
 * @returns {Promise<Array>} - Matching cases
 */
caseSchema.statics.searchCases = function(userId, searchText) {
    return this.find({
        userId,
        $text: { $search: searchText }
    })
    .sort({ score: { $meta: 'textScore' } })
    .exec();
};

// ========================================
// PRE-SAVE MIDDLEWARE
// ========================================

// Update completedAt when marking as completed
caseSchema.pre('save', function(next) {
    if (this.isModified('completed') && this.completed && !this.completedAt) {
        this.completedAt = new Date();
        this.status = 'completed';
    }
    next();
});

// ========================================
// JSON TRANSFORM
// ========================================

// Customize JSON output (include virtuals)
caseSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

caseSchema.set('toObject', { virtuals: true });

// ========================================
// CREATE AND EXPORT MODEL
// ========================================

const Case = mongoose.model('Case', caseSchema);

module.exports = Case;