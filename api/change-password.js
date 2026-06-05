// Trigger Vercel redeployment to apply new environment variables
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const initAdmin = () => {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountVar) {
        throw new Error('La variable de entorno FIREBASE_SERVICE_ACCOUNT no está configurada.');
    }

    let credential;
    try {
        const serviceAccount = JSON.parse(serviceAccountVar);
        credential = admin.credential.cert(serviceAccount);
    } catch (e) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT no es un JSON válido: ' + e.message);
    }

    return admin.initializeApp({
        credential
    });
};

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Método no permitido. Use POST.' });
    }

    const { targetUid, newPassword } = req.body;

    if (!targetUid || !newPassword) {
        return res.status(400).json({ error: 'Faltan parámetros: targetUid y newPassword son requeridos.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado. Se requiere token Bearer.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const app = initAdmin();
        const auth = admin.auth(app);
        const db = admin.firestore(app);

        // Verify the ID token
        const decodedToken = await auth.verifyIdToken(idToken);
        const adminUid = decodedToken.uid;

        // Verify that the caller is an administrator in Firestore
        const adminDoc = await db.collection('users').doc(adminUid).get();
        if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
            return res.status(403).json({ error: 'Prohibido: Solo los administradores pueden realizar esta acción.' });
        }

        // Update the target user's password
        await auth.updateUser(targetUid, { password: newPassword });

        // Update the updatedAt timestamp in the target user's Firestore document
        const userRef = db.collection('users').doc(targetUid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            await userRef.update({
                updatedAt: new Date().toISOString()
            });
        }

        return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Error al cambiar la contraseña:', error);
        return res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
}
