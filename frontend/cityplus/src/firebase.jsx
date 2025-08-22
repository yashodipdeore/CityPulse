import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  // Replace with your actual Firebase config
  apiKey: "AIzaSyD7vPuqdP578AUbW5ii0bfpeP1eXgbaWL4",
  authDomain: "members@citypulse-82305.firebaseapp.com",
  projectId: "citypulse-82305",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "838199654315",
  appId: "your-app-id",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth };
