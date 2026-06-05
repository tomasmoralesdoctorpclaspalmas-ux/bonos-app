import { createUserAccount, auth } from './auth';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { addUserData } from './db';

// Credenciales del administrador por defecto
const DEFAULT_ADMIN = {
    email: 'admin@bonos.local',
    password: 'Bonos@Admin2026!Secure',
    userData: {
        name: 'Administrador Principal',
        role: 'admin',
        phone: '',
        companyName: 'Sistema de Bonos'
    }
};

export const initializeDefaultAdmin = async () => {
    try {
        console.log('🔧 Inicializando administrador por defecto...');
        console.log('📧 Email:', DEFAULT_ADMIN.email);
        console.log('🔑 Contraseña:', DEFAULT_ADMIN.password);

        const uid = await createUserAccount(
            DEFAULT_ADMIN.email,
            DEFAULT_ADMIN.password,
            DEFAULT_ADMIN.userData
        );

        console.log('✅ Administrador creado exitosamente!');
        console.log('UID:', uid);
        console.log('\n📝 Guarda estas credenciales:');
        console.log('   Email:', DEFAULT_ADMIN.email);
        console.log('   Contraseña:', DEFAULT_ADMIN.password);

        return true;
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log('ℹ️  El usuario Auth ya existe. Intentando restaurar datos en Firestore...');
            try {
                // 1. Iniciar sesión para obtener UID
                const userCredential = await signInWithEmailAndPassword(
                    auth,
                    DEFAULT_ADMIN.email,
                    DEFAULT_ADMIN.password
                );
                const uid = userCredential.user.uid;

                // 2. Asegurar que existen los datos en Firestore
                await setDoc(doc(db, 'users', uid), {
                    ...DEFAULT_ADMIN.userData,
                    email: DEFAULT_ADMIN.email,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                console.log('✅ Datos de administrador restaurados correctamente.');
                return true;
            } catch (recoveryError) {
                console.error('❌ Error al intentar recuperar el admin:', recoveryError);
                throw recoveryError; // Re-lanzar para que el botón de la UI muestre el error
            }
        }

        console.error('❌ Error al crear administrador:', error.message);
        return false;
    }
};

// Exportar credenciales para referencia
export const ADMIN_CREDENTIALS = {
    email: DEFAULT_ADMIN.email,
    password: DEFAULT_ADMIN.password
};
