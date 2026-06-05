import { createUserAccount, loginUser, getCurrentUserData } from './auth';
import { supabase } from './supabase';

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
        console.log('🔧 Inicializando administrador en Supabase por defecto...');
        console.log('📧 Email:', DEFAULT_ADMIN.email);
        console.log('🔑 Contraseña:', DEFAULT_ADMIN.password);

        const uid = await createUserAccount(
            DEFAULT_ADMIN.email,
            DEFAULT_ADMIN.password,
            DEFAULT_ADMIN.userData
        );

        console.log('✅ Administrador creado exitosamente!');
        console.log('UID:', uid);

        return true;
    } catch (error) {
        // En Supabase, si el email ya existe, el mensaje de error o código indicará que el usuario ya existe
        console.log('ℹ️ Intentando restaurar datos de administrador en la tabla de perfiles...');
        try {
            // 1. Iniciar sesión para verificar credenciales y obtener el perfil
            const userData = await loginUser(
                DEFAULT_ADMIN.email,
                DEFAULT_ADMIN.password
            );
            const uid = userData.uid;

            // 2. Asegurar que existen los datos en la tabla de usuarios
            const { error: setProfileError } = await supabase
                .from('users')
                .upsert({
                    id: uid,
                    name: DEFAULT_ADMIN.userData.name,
                    email: DEFAULT_ADMIN.email,
                    phone: DEFAULT_ADMIN.userData.phone || '',
                    role: DEFAULT_ADMIN.userData.role || 'admin',
                    company_name: DEFAULT_ADMIN.userData.companyName || '',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (setProfileError) throw setProfileError;

            console.log('✅ Datos de administrador restaurados correctamente en la base de datos.');
            return true;
        } catch (recoveryError) {
            console.error('❌ Error al intentar recuperar el admin:', recoveryError);
            throw recoveryError;
        }
    }
};

// Exportar credenciales para referencia
export const ADMIN_CREDENTIALS = {
    email: DEFAULT_ADMIN.email,
    password: DEFAULT_ADMIN.password
};
