import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAxFJenjnIhaTn_oVuEzQzbRgy5o9eEfXE",
    authDomain: "messager-acaf1.firebaseapp.com",
    databaseURL: "https://messager-acaf1-default-rtdb.firebaseio.com",
    projectId: "messager-acaf1",
    storageBucket: "messager-acaf1.firebasestorage.app",
    messagingSenderId: "479739207658",
    appId: "1:479739207658:web:12b4107c5af445c14c1c93",
    measurementId: "G-8ZYVZNNC2Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const database = getDatabase(app);
