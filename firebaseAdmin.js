/**
 * Firebase Admin SDK Initialization
 * Sets up Firebase Admin for authentication and messaging
 */

const admin = require('firebase-admin');

// Validate required environment variables
if (!process.env.FIREBASE_PROJECT_ID) {
  throw new Error('FIREBASE_PROJECT_ID is not defined in environment variables');
}

if (!process.env.FIREBASE_CLIENT_EMAIL) {
  throw new Error('FIREBASE_CLIENT_EMAIL is not defined in environment variables');
}

if (!process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error('FIREBASE_PRIVATE_KEY is not defined in environment variables');
}

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines with actual newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });

  console.log('========================================');
  console.log('✅ Firebase Admin SDK Initialized');
  console.log('========================================');
  console.log(`📍 Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`📧 Service Account: ${process.env.FIREBASE_CLIENT_EMAIL}`);
  console.log('========================================');

} catch (error) {
  console.error('========================================');
  console.error('❌ Firebase Admin SDK Initialization Failed');
  console.error('========================================');
  console.error('Error:', error.message);
  console.error('========================================');
  
  // Check specific error causes
  if (error.message.includes('private_key')) {
    console.error('💡 Tip: Check if FIREBASE_PRIVATE_KEY is properly formatted in .env');
    console.error('   It should include \\n for line breaks');
  }
  
  process.exit(1);
}

// Export admin instance
module.exports = admin;