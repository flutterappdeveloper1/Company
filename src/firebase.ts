import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getMessaging, isSupported, getToken, Messaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: "AIzaSyAuhx06F_hL3aXzNJXNNXdr8f5Zgmot_BI",
  authDomain: "company-1e94d.firebaseapp.com",
  projectId: "company-1e94d",
  storageBucket: "company-1e94d.firebasestorage.app",
  messagingSenderId: "351169561343",
  appId: "1:351169561343:web:c0c395b0761da8c214c2ca",
  measurementId: "G-0391GYC9JS"
};

// VAPID Public Key for Web Push (Firebase Cloud Messaging)
export const VAPID_KEY = "BGfpGSRcmLrbKt6hCblwGEsBksGS7jB98x7Br6WiTvuP3yRaH93BeoM0p8t4Dd904JyDvWR0AEPB9KgZRYuRubI";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Safe messaging service initialization
export let messaging: Messaging | null = null;

isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  } else {
    console.warn("Firebase Cloud Messaging is not supported in this environment/browser.");
  }
}).catch((err) => {
  console.warn("Failed to check Messaging support:", err);
});

// Helper to request notification permission and return token
export async function requestNotificationToken() {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("Messaging is not supported on this browser.");
      return null;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn("Notifications are not available on this browser/window.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn("Notification permission denied by user.");
      return null;
    }

    const currentMessaging = getMessaging(app);
    const token = await getToken(currentMessaging, {
      vapidKey: VAPID_KEY
    });
    return token;
  } catch (error) {
    console.error("An error occurred while retrieving registration token:", error);
    return null;
  }
}

// Validate connection to Firestore defensively
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection initialized successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("Please check your Firebase configuration or internet connection. Client is offline.");
    } else {
      console.log("Firebase initialized. Real-time connections are ready.");
    }
  }
}

testConnection();

export default app;
