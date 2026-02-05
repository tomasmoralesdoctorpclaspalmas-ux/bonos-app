import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    where,
    Timestamp,
    setDoc
} from 'firebase/firestore';
import { db } from './firebase';

const BONOS_COLLECTION = 'bonos';
const USERS_COLLECTION = 'users';
const INTERVENTIONS_COLLECTION = 'interventions';

// ============ BONOS ============

// Get all bonos
export const getBonos = async () => {
    try {
        const q = query(collection(db, BONOS_COLLECTION), orderBy('issueDate', 'desc'));
        const querySnapshot = await getDocs(q);
        const bonos = [];

        querySnapshot.forEach((doc) => {
            bonos.push({
                id: doc.id,
                ...doc.data(),
                issueDate: doc.data().issueDate?.toDate().toISOString(),
                expiryDate: doc.data().expiryDate?.toDate().toISOString()
            });
        });

        return bonos;
    } catch (error) {
        console.error('Error getting bonos:', error);
        throw error;
    }
};

// Get bonos by client
export const getBonosByClient = async (clientId) => {
    try {
        const q = query(
            collection(db, BONOS_COLLECTION),
            where('clientId', '==', clientId)
        );
        const querySnapshot = await getDocs(q);
        const bonos = [];

        querySnapshot.forEach((doc) => {
            bonos.push({
                id: doc.id,
                ...doc.data(),
                issueDate: doc.data().issueDate?.toDate().toISOString(),
                expiryDate: doc.data().expiryDate?.toDate().toISOString()
            });
        });

        // Sort in client-side to avoid Firestore index requirement
        return bonos.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
    } catch (error) {
        console.error('Error getting client bonos:', error);
        throw error;
    }
};

// Add a new bono
export const addBono = async (bonoData) => {
    try {
        const newBono = {
            ...bonoData,
            issueDate: Timestamp.fromDate(new Date(bonoData.issueDate)),
            expiryDate: bonoData.expiryDate ? Timestamp.fromDate(new Date(bonoData.expiryDate)) : null,
            createdAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, BONOS_COLLECTION), newBono);
        return {
            id: docRef.id,
            ...bonoData
        };
    } catch (error) {
        console.error('Error adding bono:', error);
        throw error;
    }
};

// Update a bono
export const updateBono = async (id, bonoData) => {
    try {
        const bonoRef = doc(db, BONOS_COLLECTION, id);
        const updateData = {
            ...bonoData,
            issueDate: Timestamp.fromDate(new Date(bonoData.issueDate)),
            expiryDate: bonoData.expiryDate ? Timestamp.fromDate(new Date(bonoData.expiryDate)) : null,
            updatedAt: Timestamp.now()
        };

        await updateDoc(bonoRef, updateData);
        return { id, ...bonoData };
    } catch (error) {
        console.error('Error updating bono:', error);
        throw error;
    }
};

// Delete a bono
export const deleteBono = async (id) => {
    try {
        await deleteDoc(doc(db, BONOS_COLLECTION, id));
        return id;
    } catch (error) {
        console.error('Error deleting bono:', error);
        throw error;
    }
};

// Update bono hours after intervention
export const updateBonoHours = async (bonoId, hoursUsed) => {
    try {
        const bonoRef = doc(db, BONOS_COLLECTION, bonoId);
        const bonoDoc = await getDoc(bonoRef);

        if (bonoDoc.exists()) {
            const currentData = bonoDoc.data();
            const newHoursUsed = (currentData.hoursUsed || 0) + hoursUsed;
            const newHoursRemaining = currentData.hours - newHoursUsed;

            await updateDoc(bonoRef, {
                hoursUsed: newHoursUsed,
                hoursRemaining: newHoursRemaining,
                status: newHoursRemaining <= 0 ? 'depleted' : currentData.status,
                updatedAt: Timestamp.now()
            });
        }
    } catch (error) {
        console.error('Error updating bono hours:', error);
        throw error;
    }
};

// ============ USERS ============

// Get all users
export const getUsers = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
        const users = [];

        querySnapshot.forEach((doc) => {
            users.push({
                uid: doc.id,
                ...doc.data()
            });
        });

        return users;
    } catch (error) {
        console.error('Error getting users:', error);
        throw error;
    }
};

// Add user data (called after Firebase Auth creates the user)
export const addUserData = async (uid, userData) => {
    try {
        await setDoc(doc(db, USERS_COLLECTION, uid), {
            ...userData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error adding user data:', error);
        throw error;
    }
};

// Update user
export const updateUser = async (uid, userData) => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            ...userData,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

// Delete user
export const deleteUser = async (uid) => {
    try {
        await deleteDoc(doc(db, USERS_COLLECTION, uid));
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

// ============ INTERVENTIONS ============

// Get interventions by client
export const getInterventionsByClient = async (clientId) => {
    try {
        const q = query(
            collection(db, INTERVENTIONS_COLLECTION),
            where('clientId', '==', clientId)
        );
        const querySnapshot = await getDocs(q);
        const interventions = [];

        querySnapshot.forEach((doc) => {
            interventions.push({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate().toISOString()
            });
        });

        // Sort in client-side to avoid Firestore index requirement
        return interventions.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error getting interventions:', error);
        throw error;
    }
};

// Add intervention
export const addIntervention = async (interventionData) => {
    try {
        const newIntervention = {
            ...interventionData,
            date: Timestamp.fromDate(new Date(interventionData.date)),
            createdAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, INTERVENTIONS_COLLECTION), newIntervention);

        // Update bono hours
        await updateBonoHours(interventionData.bonoId, interventionData.hoursUsed);

        return {
            id: docRef.id,
            ...interventionData
        };
    } catch (error) {
        console.error('Error adding intervention:', error);
        throw error;
    }
};

// Update intervention
export const updateIntervention = async (id, interventionData) => {
    try {
        const interventionRef = doc(db, INTERVENTIONS_COLLECTION, id);
        const updateData = {
            ...interventionData,
            date: interventionData.date ? Timestamp.fromDate(new Date(interventionData.date)) : Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        await updateDoc(interventionRef, updateData);
        return { id, ...interventionData };
    } catch (error) {
        console.error('Error updating intervention:', error);
        throw error;
    }
};

// Delete intervention
export const deleteIntervention = async (id, interventionData) => {
    try {
        // First, restore the hours to the bono
        if (interventionData.bonoId && interventionData.hoursUsed) {
            const bonoRef = doc(db, BONOS_COLLECTION, interventionData.bonoId);
            const bonoDoc = await getDoc(bonoRef);

            if (bonoDoc.exists()) {
                const currentData = bonoDoc.data();
                const newHoursUsed = Math.max(0, (currentData.hoursUsed || 0) - interventionData.hoursUsed);
                const newHoursRemaining = currentData.hours - newHoursUsed;

                await updateDoc(bonoRef, {
                    hoursUsed: newHoursUsed,
                    hoursRemaining: newHoursRemaining,
                    status: newHoursRemaining > 0 ? 'active' : currentData.status,
                    updatedAt: Timestamp.now()
                });
            }
        }

        // Then delete the intervention
        await deleteDoc(doc(db, INTERVENTIONS_COLLECTION, id));
        return id;
    } catch (error) {
        console.error('Error deleting intervention:', error);
        throw error;
    }
};

// Check and update expired bonos
export const checkExpiredBonos = (bonos) => {
    const now = new Date();
    return bonos.map(bono => {
        if (bono.neverExpires) {
            return bono;
        }

        if (bono.status === 'active' && bono.expiryDate && new Date(bono.expiryDate) < now) {
            return { ...bono, status: 'expired' };
        }

        if (bono.hoursRemaining <= 0 && bono.status === 'active') {
            return { ...bono, status: 'depleted' };
        }

        return bono;
    });
};
