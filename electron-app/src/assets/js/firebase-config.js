// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, collectionGroup, getDocs, deleteDoc, query, orderBy, limit, startAfter, where, startAt, endAt, limitToLast, endBefore, increment, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA26ajnCTs20mcB_Dce5wDNn3Ics2Q4qoc",
    authDomain: "buddika-stores.firebaseapp.com",
    projectId: "buddika-stores",
    storageBucket: "buddika-stores.firebasestorage.app",
    messagingSenderId: "441313974780",
    appId: "1:441313974780:web:9f33f5c77d0fd904d4e94d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Export services for use in other files
export { auth, db, storage, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, doc, setDoc, getDoc, updateDoc, collection, collectionGroup, getDocs, deleteDoc, query, orderBy, limit, startAfter, where, startAt, endAt, limitToLast, endBefore, increment, addDoc, ref, uploadBytes, getDownloadURL };
