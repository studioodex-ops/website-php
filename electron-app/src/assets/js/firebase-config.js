// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, collectionGroup, getDocs, deleteDoc, query, orderBy, limit, startAfter, where, startAt, endAt, limitToLast, endBefore, increment, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCGYJeWqgsK69IE6Jd3v_gnBXvi7E7ZdUo",
    authDomain: "buddika-stores-web.firebaseapp.com",
    projectId: "buddika-stores-web",
    storageBucket: "buddika-stores-web.firebasestorage.app",
    messagingSenderId: "735788546514",
    appId: "1:735788546514:web:9cf85d0d6caa55d907700b",
    measurementId: "G-4B5Y4LFDQ2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Export services for use in other files
export { auth, db, storage, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, doc, setDoc, getDoc, updateDoc, collection, collectionGroup, getDocs, deleteDoc, query, orderBy, limit, startAfter, where, startAt, endAt, limitToLast, endBefore, increment, addDoc, ref, uploadBytes, getDownloadURL };
