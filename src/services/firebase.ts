import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Use configuration from generated firebase-applet-config.json
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

const dbId = firebaseConfigJson.firestoreDatabaseId || '(default)';

function initDb(targetApp: FirebaseApp, targetDbId: string): Firestore {
  try {
    return getFirestore(targetApp, targetDbId);
  } catch {
    return initializeFirestore(targetApp, {}, targetDbId);
  }
}

export const db = initDb(app, dbId);

export const storage = getStorage(app);

export default app;
