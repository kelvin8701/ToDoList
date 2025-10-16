import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

// Replace the placeholder values below with your actual Firebase project settings.
// Keep this file out of version control (already ignored via .gitignore).
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const isPlaceholderValue = (value) =>
  typeof value === "string" &&
  (value.startsWith("YOUR_") || value.includes("your-project-id"));

const hasPlaceholders = Object.values(firebaseConfig).some(isPlaceholderValue);

export const firebaseApp = hasPlaceholders
  ? (() => {
      console.warn(
        "Firebase not initialized. Update assets/js/firebase-config.js with your real project keys."
      );
      return null;
    })()
  : initializeApp(firebaseConfig);
