import { createClient } from '@supabase/supabase-js';

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

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ 
            error: 'Configuración de servidor incompleta. VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidos.' 
        });
    }

    try {
        // Initialize Supabase Admin client with service role key
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Verify the ID token / JWT and get the user
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(idToken);
        
        if (authError || !user) {
            return res.status(401).json({ error: 'Token de sesión inválido o expirado.' });
        }

        const adminUid = user.id;

        // Verify that the caller is an administrator in the database
        const { data: adminProfile, error: dbError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', adminUid)
            .single();

        if (dbError || !adminProfile || adminProfile.role !== 'admin') {
            return res.status(403).json({ error: 'Prohibido: Solo los administradores pueden realizar esta acción.' });
        }

        // Update the target user's auth password in Supabase Auth
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
            targetUid,
            { password: newPassword }
        );

        if (updateAuthError) {
            throw updateAuthError;
        }

        // Update the updated_at timestamp in the target user's profile table
        const { error: updateProfileError } = await supabaseAdmin
            .from('users')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', targetUid);

        if (updateProfileError) {
            console.warn('Advertencia: No se pudo actualizar el timestamp del perfil del usuario.', updateProfileError.message);
        }

        return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Error al cambiar la contraseña en Supabase:', error);
        return res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
}
