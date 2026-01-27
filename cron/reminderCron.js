/**
 * Reminder Cron Job - Automated Case Reminder System
 * Runs daily to check cases due in 2 days and sends push notifications
 */

const cron = require('node-cron');
const Case = require('../models/Case');
const admin = require('../firebaseAdmin');

/**
 * Calculate date range for cases due in exactly 2 days
 * @returns {Object} { startDate, endDate }
 */
const getTwoDaysFromNowRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Target date: 2 days from now
  const twoDaysFromNow = new Date(today);
  twoDaysFromNow.setDate(today.getDate() + 2);
  
  // End of that day
  const endOfDay = new Date(twoDaysFromNow);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    startDate: twoDaysFromNow,
    endDate: endOfDay
  };
};

/**
 * Send push notification via Firebase Cloud Messaging
 * @param {String} deviceToken - FCM device token
 * @param {Object} caseData - Case details for notification
 */
const sendPushNotification = async (deviceToken, caseData) => {
  try {
    const message = {
      notification: {
        title: '⚖️ Case Due Reminder',
        body: `Your case "${caseData.caseTitle}" for ${caseData.clientName} is due in 2 days.`
      },
      data: {
        caseId: caseData._id.toString(),
        clientName: caseData.clientName,
        caseTitle: caseData.caseTitle,
        dueDate: caseData.dueDate.toISOString(),
        type: 'case_reminder'
      },
      token: deviceToken
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Notification sent successfully to token: ${deviceToken.substring(0, 20)}...`);
    console.log(`   Response: ${response}`);
    return { success: true, response };

  } catch (error) {
    console.error(`❌ Failed to send notification to token: ${deviceToken.substring(0, 20)}...`);
    console.error(`   Error: ${error.message}`);
    
    // Handle invalid or expired tokens
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.log(`   Token is invalid or expired, should be removed from database`);
      return { success: false, invalidToken: true };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to multiple devices for a user
 * @param {String} userId - Firebase user ID
 * @param {Object} caseData - Case details
 */
const sendNotificationToUser = async (userId, caseData) => {
  try {
    // Import User model (assuming you have one with device tokens)
    const User = require('../models/User');
    
    // Find user and get their device tokens
    const user = await User.findOne({ firebaseUid: userId });
    
    if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
      console.log(`⚠️  No device tokens found for user: ${userId}`);
      return { success: false, reason: 'no_tokens' };
    }

    console.log(`📱 Found ${user.deviceTokens.length} device token(s) for user: ${userId}`);

    // Send notification to all registered devices
    const results = [];
    const invalidTokens = [];

    for (const token of user.deviceTokens) {
      const result = await sendPushNotification(token, caseData);
      results.push(result);
      
      // Track invalid tokens for cleanup
      if (result.invalidToken) {
        invalidTokens.push(token);
      }
    }

    // Remove invalid tokens from database
    if (invalidTokens.length > 0) {
      await User.findOneAndUpdate(
        { firebaseUid: userId },
        { $pull: { deviceTokens: { $in: invalidTokens } } }
      );
      console.log(`🗑️  Removed ${invalidTokens.length} invalid token(s) from user: ${userId}`);
    }

    const successCount = results.filter(r => r.success).length;
    return { 
      success: successCount > 0, 
      totalSent: successCount,
      totalFailed: results.length - successCount
    };

  } catch (error) {
    console.error(`❌ Error sending notification to user ${userId}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Main reminder checking logic
 * Finds all cases due in 2 days and sends notifications
 */
const checkAndSendReminders = async () => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔔 REMINDER CRON JOB STARTED');
    console.log('='.repeat(60));
    console.log(`⏰ Execution Time: ${new Date().toLocaleString()}`);

    // Get date range for cases due in 2 days
    const { startDate, endDate } = getTwoDaysFromNowRange();
    
    console.log(`📅 Checking cases due on: ${startDate.toDateString()}`);
    console.log(`   Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Find all cases that:
    // 1. Are due in exactly 2 days
    // 2. Haven't had reminders sent yet
    const casesToRemind = await Case.find({
      dueDate: {
        $gte: startDate,
        $lte: endDate
      },
      reminderSent: false
    }).select('userId clientName caseTitle dueDate description');

    console.log(`📋 Found ${casesToRemind.length} case(s) requiring reminders`);

    if (casesToRemind.length === 0) {
      console.log('✅ No reminders to send at this time');
      console.log('='.repeat(60) + '\n');
      return { success: true, remindersSent: 0 };
    }

    // Track statistics
    let successCount = 0;
    let failureCount = 0;

    // Process each case
    for (let i = 0; i < casesToRemind.length; i++) {
      const caseItem = casesToRemind[i];
      
      console.log(`\n[${i + 1}/${casesToRemind.length}] Processing Case:`);
      console.log(`   Case ID: ${caseItem._id}`);
      console.log(`   Title: ${caseItem.caseTitle}`);
      console.log(`   Client: ${caseItem.clientName}`);
      console.log(`   Due Date: ${caseItem.dueDate.toDateString()}`);
      console.log(`   User ID: ${caseItem.userId}`);

      // Send notification to user
      const notificationResult = await sendNotificationToUser(caseItem.userId, caseItem);

      if (notificationResult.success) {
        // Mark reminder as sent in database
        await Case.findByIdAndUpdate(caseItem._id, {
          reminderSent: true,
          reminderSentAt: new Date()
        });

        successCount++;
        console.log(`   ✅ Reminder sent and marked in database`);
        console.log(`   📊 Devices notified: ${notificationResult.totalSent}`);
      } else {
        failureCount++;
        console.log(`   ❌ Failed to send reminder: ${notificationResult.reason || notificationResult.error}`);
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 REMINDER CRON JOB COMPLETED');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📋 Total Processed: ${casesToRemind.length}`);
    console.log(`⏰ Finished at: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      remindersSent: successCount,
      remindersFailed: failureCount,
      totalCases: casesToRemind.length
    };

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ REMINDER CRON JOB FAILED');
    console.error('='.repeat(60));
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error('='.repeat(60) + '\n');

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Initialize and schedule the cron job
 * Runs every day at 9:00 AM (customize as needed)
 */
const initializeReminderCron = () => {
  console.log('🚀 Initializing Reminder Cron Job...');

  // Schedule: Run every day at 9:00 AM
  // Cron format: minute hour day month weekday
  // '0 9 * * *' = At 9:00 AM every day
  const cronSchedule = '0 9 * * *';

  const job = cron.schedule(cronSchedule, async () => {
    await checkAndSendReminders();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Change to your timezone (e.g., "America/New_York", "Europe/London")
  });

  console.log(`✅ Cron job scheduled: Daily at 9:00 AM (Asia/Kolkata timezone)`);
  console.log(`🔔 Cron will check for cases due in 2 days and send push notifications`);
  console.log(`⏰ Cron pattern: ${cronSchedule}`);

  // Optional: Run immediately on server start for testing
  // Uncomment the line below to test on server startup
  // setTimeout(() => checkAndSendReminders(), 5000); // Run after 5 seconds

  return job;
};

/**
 * Manual trigger function for testing
 * Can be called via API endpoint for manual testing
 */
const manualTriggerReminders = async () => {
  console.log('🔧 MANUAL TRIGGER - Running reminder check...');
  return await checkAndSendReminders();
};

// ==================== EXPORTS ====================

module.exports = {
  initializeReminderCron,
  checkAndSendReminders,
  manualTriggerReminders
};