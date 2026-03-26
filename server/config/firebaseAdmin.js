const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

const isReadableFile = (filePath) => {
    try {
        return fs.statSync(filePath).isFile();
    } catch (error) {
        return false;
    }
};

const readServiceAccount = (filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
};

const readServiceAccountFromEnv = () => {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64) {
        const decodedValue = Buffer.from(
            process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64,
            'base64'
        ).toString('utf8');

        return JSON.parse(decodedValue);
    }

    return null;
};

const initializeWithCredential = (credential, source) => {
    if (!admin.apps.length) {
        admin.initializeApp({ credential });
    }

    console.log(`Firebase Admin initialized using ${source}`);
};

const initializeFirebaseAdmin = () => {
    const applicationCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    try {
        const serviceAccountFromEnv = readServiceAccountFromEnv();
        if (serviceAccountFromEnv) {
            const source = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64
                ? 'FIREBASE_SERVICE_ACCOUNT_JSON_BASE64'
                : 'FIREBASE_SERVICE_ACCOUNT_JSON';

            initializeWithCredential(admin.credential.cert(serviceAccountFromEnv), source);
            return admin;
        }

        if (applicationCredentialsPath) {
            if (!isReadableFile(applicationCredentialsPath)) {
                throw new Error(`GOOGLE_APPLICATION_CREDENTIALS points to a missing file: ${applicationCredentialsPath}`);
            }

            const serviceAccount = readServiceAccount(applicationCredentialsPath);
            initializeWithCredential(admin.credential.cert(serviceAccount), 'GOOGLE_APPLICATION_CREDENTIALS');
            return admin;
        }

        if (isReadableFile(serviceAccountPath)) {
            const serviceAccount = readServiceAccount(serviceAccountPath);
            initializeWithCredential(admin.credential.cert(serviceAccount), 'serviceAccountKey.json fallback');
            return admin;
        }
    } catch (error) {
        if (process.env.NODE_ENV === 'production') {
            throw error;
        }

        console.warn(`Firebase Admin initialization warning: ${error.message}`);
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'Firebase Admin credentials are missing. Configure FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_JSON_BASE64, GOOGLE_APPLICATION_CREDENTIALS, or a readable serviceAccountKey.json before starting the server.'
        );
    }

    console.warn('Firebase Admin credentials not found. Auth routes will fail until Firebase credentials are configured.');
    return admin;
};

module.exports = initializeFirebaseAdmin();
