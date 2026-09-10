import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

let firestoreInstance: Firestore | null = null;

try {
  let config: any = {};
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.warn('Could not parse firebase-applet-config.json:', e);
    }
  }

  let app: FirebaseApp;
  if (getApps().length === 0) {
    if (config && config.apiKey && config.projectId) {
      app = initializeApp(config);
    } else {
      app = initializeApp({
        apiKey: 'demo-api-key',
        authDomain: 'demo-app.firebaseapp.com',
        projectId: 'demo-project'
      });
    }
  } else {
    app = getApps()[0];
  }

  firestoreInstance = config?.firestoreDatabaseId 
    ? getFirestore(app, config.firestoreDatabaseId) 
    : getFirestore(app);
} catch (err) {
  console.warn('Firebase Firestore initialization notice (safe fallback mode):', err);
  firestoreInstance = null;
}

export const firestore = firestoreInstance as Firestore;


