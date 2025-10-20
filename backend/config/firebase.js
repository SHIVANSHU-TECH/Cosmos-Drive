let admin, db;

try {
  // Try to import firebase-admin
  admin = require('firebase-admin');
  
  // Firebase configuration
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };

  // Check if required service account properties are present
  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
    console.warn('Firebase service account credentials not fully configured. Firebase features will be disabled.');
    admin = null;
    db = null;
  } else {
    try {
      // Initialize Firebase Admin SDK with the correct database URL
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
        });
      }

      db = admin.database(); // Use Realtime Database instead of Firestore
      console.log('Firebase initialized successfully');
    } catch (initError) {
      console.warn('Firebase initialization failed:', initError.message);
      console.warn('Firebase features will be disabled.');
      admin = null;
      db = null;
    }
  }
} catch (error) {
  console.warn('Firebase module not found or initialization failed:', error.message);
  console.warn('Firebase features will be disabled. Install firebase-admin if you want to use Firebase.');
  admin = null;
  db = null;
}

module.exports = { admin, db };