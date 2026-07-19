// Scripts for firebase-messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase App in service worker
firebase.initializeApp({
  apiKey: "AIzaSyAuhx06F_hL3aXzNJXNNXdr8f5Zgmot_BI",
  authDomain: "company-1e94d.firebaseapp.com",
  projectId: "company-1e94d",
  storageBucket: "company-1e94d.firebasestorage.app",
  messagingSenderId: "351169561343",
  appId: "1:351169561343:web:c0c395b0761da8c214c2ca"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'নিউ নোটিফিকেশন';
  const notificationOptions = {
    body: payload.notification.body || 'আপনার অ্যাপে একটি আপডেট আছে।',
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
