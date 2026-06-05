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
const PUNCTUAL_INTERVENTIONS_COLLECTION = 'punctual_interventions';
const EMPRESAS_COLLECTION = 'empresas';

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

// ============ EMPRESAS ============

// Get all empresas
export const getEmpresas = async () => {
    try {
        // We order by name using client-side sort to avoid requiring a composite index immediately if none exists
        const querySnapshot = await getDocs(collection(db, EMPRESAS_COLLECTION));
        const empresas = [];
        querySnapshot.forEach((doc) => {
            empresas.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return empresas.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
        console.error('Error getting empresas (puede que falten permisos en Firestore):', error);
        return []; // Retorna array vacío en vez de romper la app //
    }
};

// Add empresa
export const addEmpresa = async (empresaData) => {
    try {
        const newEmpresa = {
            ...empresaData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, EMPRESAS_COLLECTION), newEmpresa);
        return {
            id: docRef.id,
            ...newEmpresa
        };
    } catch (error) {
        console.error('Error adding empresa:', error);
        throw error;
    }
};

// Update empresa
export const updateEmpresa = async (id, empresaData) => {
    try {
        const docRef = doc(db, EMPRESAS_COLLECTION, id);
        const updateData = {
            ...empresaData,
            updatedAt: Timestamp.now()
        };
        await updateDoc(docRef, updateData);
        return { id, ...updateData };
    } catch (error) {
        console.error('Error updating empresa:', error);
        throw error;
    }
};

// Delete empresa
export const deleteEmpresa = async (id) => {
    try {
        await deleteDoc(doc(db, EMPRESAS_COLLECTION, id));
        return id;
    } catch (error) {
        console.error('Error deleting empresa:', error);
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

// Get all interventions
export const getInterventions = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, INTERVENTIONS_COLLECTION));
        const interventions = [];

        querySnapshot.forEach((doc) => {
            interventions.push({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate().toISOString()
            });
        });

        return interventions;
    } catch (error) {
        console.error('Error getting all interventions:', error);
        throw error;
    }
};

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
        const interventionDoc = await getDoc(interventionRef);
        
        if (!interventionDoc.exists()) {
            throw new Error('Intervention not found');
        }

        const oldData = interventionDoc.data();
        const oldHours = typeof oldData.hoursUsed === 'number' ? oldData.hoursUsed : 0;
        const newHours = typeof interventionData.hoursUsed === 'number' ? interventionData.hoursUsed : oldHours;
        const hourDiff = newHours - oldHours;

        if (hourDiff !== 0 && oldData.bonoId) {
            const bonoRef = doc(db, BONOS_COLLECTION, oldData.bonoId);
            const bonoDoc = await getDoc(bonoRef);
            if (bonoDoc.exists()) {
                const bonoData = bonoDoc.data();
                await updateDoc(bonoRef, {
                    hoursRemaining: bonoData.hoursRemaining - hourDiff,
                    hoursUsed: (bonoData.hoursUsed || 0) + hourDiff,
                    updatedAt: Timestamp.now()
                });
            }
        }

        const updateData = {
            ...interventionData,
            date: interventionData.date ? Timestamp.fromDate(new Date(interventionData.date)) : oldData.date,
            updatedAt: Timestamp.now()
        };

        await updateDoc(interventionRef, updateData);
        // Devolvemos todos los datos combinados para que re-renderice en UI
        return { id, ...oldData, ...updateData, date: updateData.date.toDate().toISOString() };
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

// ============ PUNCTUAL INTERVENTIONS (No User/Bono) ============

// Get all punctual interventions
export const getPunctualInterventions = async () => {
    try {
        const q = query(collection(db, PUNCTUAL_INTERVENTIONS_COLLECTION), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const interventions = [];

        querySnapshot.forEach((doc) => {
            interventions.push({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate().toISOString()
            });
        });

        return interventions;
    } catch (error) {
        console.error('Error getting punctual interventions:', error);
        throw error;
    }
};

// Get punctual interventions by client
export const getPunctualInterventionsByClient = async (clientId) => {
    try {
        const q = query(
            collection(db, PUNCTUAL_INTERVENTIONS_COLLECTION),
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

        return interventions.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error getting punctual interventions by client:', error);
        throw error;
    }
};

// Add punctual intervention
export const addPunctualIntervention = async (data) => {
    try {
        const newDoc = {
            ...data,
            date: Timestamp.fromDate(new Date(data.date)),
            createdAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, PUNCTUAL_INTERVENTIONS_COLLECTION), newDoc);
        return {
            id: docRef.id,
            ...data
        };
    } catch (error) {
        console.error('Error adding punctual intervention:', error);
        throw error;
    }
};

// Update punctual intervention (now supports full fields edits)
export const updatePunctualIntervention = async (id, data) => {
    try {
        const docRef = doc(db, PUNCTUAL_INTERVENTIONS_COLLECTION, id);
        const updateData = {
            ...data,
            updatedAt: Timestamp.now()
        };
        if (data.date) {
            updateData.date = Timestamp.fromDate(new Date(data.date));
        }
        await updateDoc(docRef, updateData);
        
        // Devolvemos el mismo dato de entrada con formato final para actualizar la cache de UI
        return { id, ...data, date: updateData.date ? updateData.date.toDate().toISOString() : data.date };
    } catch (error) {
        console.error('Error updating punctual intervention:', error);
        throw error;
    }
};

// Delete punctual intervention
export const deletePunctualIntervention = async (id) => {
    try {
        const docRef = doc(db, PUNCTUAL_INTERVENTIONS_COLLECTION, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting punctual intervention:', error);
        throw error;
    }
};
