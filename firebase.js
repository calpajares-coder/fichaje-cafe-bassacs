import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBSMxxgwOB3gQZJusToaK0MwXNiEkIOIi8",
  authDomain: "fichaje-cafe-bassacs.firebaseapp.com",
  projectId: "fichaje-cafe-bassacs",
  storageBucket: "fichaje-cafe-bassacs.firebasestorage.app",
  messagingSenderId: "870742000982",
  appId: "1:870742000982:web:90714f11d326d5c4c082f7"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);