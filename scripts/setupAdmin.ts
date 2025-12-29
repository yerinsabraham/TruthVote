// Run this script once to set custom claims for the admin user
// Usage: npm run setup-admin

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const serviceAccount = require('../truthvote-1de81-firebase-adminsdk-fbsvc-f3f9239d18.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'yerinssaibs@gmail.com';

async function setupAdmin() {
  try {
    console.log(`Setting up admin user: ${ADMIN_EMAIL}`);
    
    // Get user by email
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    console.log(`Found user: ${user.uid}`);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log('✓ Custom admin claim set successfully');
    
    // Update Firestore user document
    await admin.firestore().collection('users').doc(user.uid).set({
      role: 'admin',
      isAdmin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✓ Firestore user document updated');
    
    // Log to audit trail
    await admin.firestore().collection('admin_logs').add({
      action: 'ADMIN_SETUP',
      adminEmail: ADMIN_EMAIL,
      userId: user.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: 'Initial admin setup - custom claims configured'
    });
    console.log('✓ Audit log created');
    
    console.log('\n✅ Admin setup complete!');
    console.log('Note: User must sign out and sign back in for changes to take effect.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up admin:', error);
    process.exit(1);
  }
}

setupAdmin();
