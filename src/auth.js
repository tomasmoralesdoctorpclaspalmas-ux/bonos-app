import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cache the current user for synchronous access (like Firebase's auth.currentUser)
let cachedUser = null;
supabase.auth.getSession().then(({ data: { session } }) => {
    cachedUser = session?.user || null;
});

supabase.auth.onAuthStateChange((event, session) => {
    cachedUser = session?.user || null;
});

export const auth = {
    get currentUser() {
        if (!cachedUser) {
            // Fallback attempt to get synchronously from supabase private state if possible
            // but the cachedUser is the most reliable way.
            return null;
        }
        return {
            uid: cachedUser.id,
            email: cachedUser.email,
            getIdToken: async (forceRefresh) => {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error || !session) return '';
                return session.access_token;
            }
        };
    }
};

// Get current user data from the database
export const getCurrentUserData = async (uid) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', uid)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Single result not found
                return null;
            }
            throw error;
        }

        // Map database fields camelCase for frontend compatibility
        return {
            uid: data.id,
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            role: data.role,
            companyName: data.company_name || '',
            empresaId: data.empresa_id || '',
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    } catch (error) {
        console.error('Error getting user data:', error);
        throw error;
    }
};

// Login user
export const loginUser = async (email, password) => {
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) throw authError;

        const user = authData.user;
        const userData = await getCurrentUserData(user.id);

        if (userData) {
            return userData;
        } else {
            throw new Error('Usuario no encontrado en la base de datos de perfiles');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
};

// Logout user
export const logoutUser = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Error logging out:', error);
        throw error;
    }
};

// Create user account (without logging out current user)
export const createUserAccount = async (email, password, userData) => {
    try {
        // Initialize an isolated Supabase client to prevent changing the current session
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email,
            password
        });

        if (authError) throw authError;
        const user = authData.user;

        if (!user) throw new Error('Error al registrar las credenciales de usuario');

        // Create the user profile in the public.users table
        const { error: dbError } = await supabase
            .from('users')
            .insert([{
                id: user.id,
                name: userData.name,
                email: email,
                phone: userData.phone || '',
                role: userData.role || 'client',
                company_name: userData.companyName || '',
                empresa_id: userData.empresaId || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);

        if (dbError) throw dbError;

        return user.id;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

// Auth state observer
export const onAuthStateChange = (callback) => {
    // Check initial state
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            getCurrentUserData(session.user.id).then(userData => {
                callback(userData);
            }).catch(() => {
                callback(null);
            });
        } else {
            callback(null);
        }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
            if (session?.user) {
                const userData = await getCurrentUserData(session.user.id);
                callback(userData);
            } else {
                callback(null);
            }
        } catch (error) {
            console.error('Error in auth state change:', error);
            callback(null);
        }
    });

    // Return unsubscriber function
    return () => {
        subscription.unsubscribe();
    };
};

// Send password reset email
export const sendPasswordReset = async (email) => {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password'
        });
        if (error) throw error;
    } catch (error) {
        console.error('Error sending password reset:', error);
        throw error;
    }
};
