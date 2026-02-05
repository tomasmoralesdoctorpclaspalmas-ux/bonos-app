import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db, firebaseConfig } from './firebase';

// Initialize Auth
export const auth = getAuth();

// Login user
export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
            return {
                uid: user.uid,
                email: user.email,
                ...userDoc.data()
            };
        } else {
            throw new Error('Usuario no encontrado en la base de datos');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
};

// Logout user
export const logoutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error logging out:', error);
        throw error;
    }
};

// Create user with email and password
export const createUserAccount = async (email, password, userData) => {
    let secondaryApp;
    try {
        // Initialize a secondary Firebase app to avoid logging out the current user (admin)
        secondaryApp = initializeApp(firebaseConfig, "secondary");
        const secondaryAuth = getAuth(secondaryApp);

        // Create user in the secondary app
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const user = userCredential.user;

        // Store user data in Firestore (using main db instance is fine)
        await setDoc(doc(db, 'users', user.uid), {
            ...userData,
            email,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Cleanup secondary auth
        await signOut(secondaryAuth);

        return user.uid;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    } finally {
        if (secondaryApp) {
            await deleteApp(secondaryApp);
        }
    }
};

// Get current user data
export const getCurrentUserData = async (uid) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));

        if (userDoc.exists()) {
            return {
                uid,
                ...userDoc.data()
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        throw error;
    }
};

// Auth state observer
export const onAuthStateChange = (callback) => {
    return onAuthStateChanged(auth, async (user) => {
        try {
            if (user) {
                const userData = await getCurrentUserData(user.uid);
                callback(userData);
            } else {
                callback(null);
            }
        } catch (error) {
            console.error('Error in auth state change:', error);
            callback(null);
        }
    });
};
