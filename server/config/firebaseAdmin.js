const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
// Option 1: Use service account JSON file (recommended for production)
// Download from Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized with service account');
} catch (error) {
    // Option 2: Use default credentials (for development/testing)
    // This will work if GOOGLE_APPLICATION_CREDENTIALS env var is set
    // or if running on Google Cloud
    console.warn('Service account not found. Firebase Admin running without verification.');
    console.warn('To enable token verification, add serviceAccountKey.json to config folder.');

    // Initialize without credentials for development
    // Token verification will be skipped but app will run
    if (!admin.apps.length) {
        admin.initializeApp();
    }
}

module.exports = admin;
