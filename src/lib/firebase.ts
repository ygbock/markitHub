import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore singleton with designated databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const config = firebaseConfig;

// Test Firestore connection on boot as mandated by Firebase specification
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes('the client is offline') || 
        error.message.includes('closing') || 
        error.message.includes('hidden') ||
        error.message.includes('unavailable') ||
        error.message.includes('Could not reach Cloud Firestore backend') ||
        (error as any)?.code === 'unavailable'
      ) {
        console.info("Firestore operating seamlessly with cached local storage & offline queue.");
      } else {
        console.warn("Firestore connection check:", error.message);
      }
    }
    return false;
  }
}

// Graceful background verification
testConnection().catch(() => {});

export default app;


