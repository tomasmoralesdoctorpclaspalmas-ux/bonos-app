import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Helper to safely parse numbers
const safeParseFloat = (val) => {
    if (val === null || val === undefined) return 0;
    const p = parseFloat(val);
    return isNaN(p) ? 0 : p;
};

// ============ MAPPING HELPERS ============

const mapBonoFromDb = (b) => {
    if (!b) return null;
    return {
        id: b.id,
        clientId: b.client_id,
        clientName: b.client_name,
        service: b.service,
        hours: safeParseFloat(b.hours),
        hoursUsed: safeParseFloat(b.hours_used),
        hoursRemaining: safeParseFloat(b.hours_remaining),
        status: b.status,
        neverExpires: b.never_expires,
        issueDate: b.issue_date,
        expiryDate: b.expiry_date,
        notes: b.notes || '',
        createdAt: b.created_at,
        updatedAt: b.updated_at
    };
};

const mapBonoToDb = (b) => {
    return {
        client_id: b.clientId || null,
        client_name: b.clientName || '',
        service: b.service || '',
        hours: safeParseFloat(b.hours),
        hours_used: safeParseFloat(b.hoursUsed),
        hours_remaining: safeParseFloat(b.hoursRemaining),
        status: b.status || 'active',
        never_expires: b.neverExpires === true,
        issue_date: b.issueDate ? new Date(b.issueDate).toISOString() : null,
        expiry_date: b.expiryDate ? new Date(b.expiryDate).toISOString() : null,
        notes: b.notes || '',
        updated_at: new Date().toISOString()
    };
};

const mapEmpresaFromDb = (e) => {
    if (!e) return null;
    return {
        id: e.id,
        name: e.name,
        createdAt: e.created_at,
        updatedAt: e.updated_at
    };
};

const mapUserFromDb = (u) => {
    if (!u) return null;
    return {
        uid: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        role: u.role,
        companyName: u.company_name || '',
        empresaId: u.empresa_id || '',
        createdAt: u.created_at,
        updatedAt: u.updated_at
    };
};

const mapInterventionFromDb = (i) => {
    if (!i) return null;
    return {
        id: i.id,
        clientId: i.client_id,
        clientName: i.client_name,
        bonoId: i.bono_id,
        hoursUsed: safeParseFloat(i.hours_used),
        date: i.date,
        notes: i.notes || '',
        createdAt: i.created_at,
        updatedAt: i.updated_at
    };
};

const mapInterventionToDb = (i) => {
    return {
        client_id: i.clientId || null,
        client_name: i.clientName || '',
        bono_id: i.bonoId || null,
        hours_used: safeParseFloat(i.hoursUsed),
        date: i.date ? new Date(i.date).toISOString() : new Date().toISOString(),
        notes: i.notes || ''
    };
};

const mapPunctualFromDb = (p) => {
    if (!p) return null;
    return {
        id: p.id,
        clientId: p.client_id,
        clientName: p.client_name,
        hours: safeParseFloat(p.hours),
        startTime: p.start_time || '',
        endTime: p.end_time || '',
        notes: p.notes || '',
        date: p.date,
        images: p.images || [],
        createdAt: p.created_at,
        updatedAt: p.updated_at
    };
};

const mapPunctualToDb = (p) => {
    return {
        client_id: p.clientId || null,
        client_name: p.clientName || '',
        hours: safeParseFloat(p.hours),
        start_time: p.startTime || '',
        end_time: p.endTime || '',
        notes: p.notes || '',
        date: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
        images: p.images || []
    };
};


// ============ BONOS ============

// Get all bonos
export const getBonos = async () => {
    try {
        const { data, error } = await supabase
            .from('bonos')
            .select('*')
            .order('issue_date', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapBonoFromDb);
    } catch (error) {
        console.error('Error getting bonos:', error);
        throw error;
    }
};

// Get bonos by client
export const getBonosByClient = async (clientId) => {
    try {
        const { data, error } = await supabase
            .from('bonos')
            .select('*')
            .eq('client_id', clientId)
            .order('issue_date', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapBonoFromDb);
    } catch (error) {
        console.error('Error getting client bonos:', error);
        throw error;
    }
};

// Add a new bono
export const addBono = async (bonoData) => {
    try {
        const id = uuidv4();
        const dbData = {
            id,
            ...mapBonoToDb(bonoData),
            created_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('bonos')
            .insert([dbData]);

        if (error) throw error;
        return {
            id,
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
        const dbData = mapBonoToDb(bonoData);

        const { error } = await supabase
            .from('bonos')
            .update(dbData)
            .eq('id', id);

        if (error) throw error;
        return { id, ...bonoData };
    } catch (error) {
        console.error('Error updating bono:', error);
        throw error;
    }
};

// Delete a bono
export const deleteBono = async (id) => {
    try {
        const { error } = await supabase
            .from('bonos')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return id;
    } catch (error) {
        console.error('Error deleting bono:', error);
        throw error;
    }
};

// Update bono hours after intervention
export const updateBonoHours = async (bonoId, hoursUsed) => {
    try {
        const { data: bono, error: getError } = await supabase
            .from('bonos')
            .select('hours, hours_used, status')
            .eq('id', bonoId)
            .single();

        if (getError) throw getError;

        if (bono) {
            const newHoursUsed = safeParseFloat(bono.hours_used) + hoursUsed;
            const newHoursRemaining = safeParseFloat(bono.hours) - newHoursUsed;

            const { error: updateError } = await supabase
                .from('bonos')
                .update({
                    hours_used: newHoursUsed,
                    hours_remaining: newHoursRemaining,
                    status: newHoursRemaining <= 0 ? 'depleted' : bono.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', bonoId);

            if (updateError) throw updateError;
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
        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapEmpresaFromDb);
    } catch (error) {
        console.error('Error getting empresas:', error);
        return [];
    }
};

// Add empresa
export const addEmpresa = async (empresaData) => {
    try {
        const id = uuidv4();
        const { error } = await supabase
            .from('empresas')
            .insert([{
                id,
                name: empresaData.name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);

        if (error) throw error;
        return {
            id,
            ...empresaData
        };
    } catch (error) {
        console.error('Error adding empresa:', error);
        throw error;
    }
};

// Update empresa
export const updateEmpresa = async (id, empresaData) => {
    try {
        const { error } = await supabase
            .from('empresas')
            .update({
                name: empresaData.name,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        return { id, ...empresaData };
    } catch (error) {
        console.error('Error updating empresa:', error);
        throw error;
    }
};

// Delete empresa
export const deleteEmpresa = async (id) => {
    try {
        const { error } = await supabase
            .from('empresas')
            .delete()
            .eq('id', id);

        if (error) throw error;
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
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;
        return (data || []).map(mapUserFromDb);
    } catch (error) {
        console.error('Error getting users:', error);
        throw error;
    }
};

// Add user data (called after Auth creates the user)
export const addUserData = async (uid, userData) => {
    try {
        const { error } = await supabase
            .from('users')
            .insert([{
                id: uid,
                name: userData.name,
                email: userData.email,
                phone: userData.phone || '',
                role: userData.role || 'client',
                company_name: userData.companyName || '',
                empresa_id: userData.empresaId || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);

        if (error) throw error;
    } catch (error) {
        console.error('Error adding user data:', error);
        throw error;
    }
};

// Update user
export const updateUser = async (uid, userData) => {
    try {
        const { error } = await supabase
            .from('users')
            .update({
                name: userData.name,
                phone: userData.phone || '',
                role: userData.role,
                company_name: userData.companyName || '',
                empresa_id: userData.empresaId || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', uid);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

// Delete user
export const deleteUser = async (uid) => {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', uid);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};


// ============ INTERVENTIONS ============

// Get interventions by client
export const getInterventionsByClient = async (clientId) => {
    try {
        const { data, error } = await supabase
            .from('interventions')
            .select('*')
            .eq('client_id', clientId)
            .order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapInterventionFromDb);
    } catch (error) {
        console.error('Error getting interventions:', error);
        throw error;
    }
};

// Get all interventions
export const getInterventions = async () => {
    try {
        const { data, error } = await supabase
            .from('interventions')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapInterventionFromDb);
    } catch (error) {
        console.error('Error getting all interventions:', error);
        throw error;
    }
};

// Add intervention
export const addIntervention = async (interventionData) => {
    try {
        const id = uuidv4();
        const dbData = {
            id,
            ...mapInterventionToDb(interventionData),
            created_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('interventions')
            .insert([dbData]);

        if (error) throw error;

        // Update bono hours
        await updateBonoHours(interventionData.bonoId, interventionData.hoursUsed);

        return {
            id,
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
        const { data: oldData, error: getError } = await supabase
            .from('interventions')
            .select('*')
            .eq('id', id)
            .single();

        if (getError) throw getError;
        if (!oldData) throw new Error('Intervention not found');

        const oldHours = safeParseFloat(oldData.hours_used);
        const newHours = safeParseFloat(interventionData.hoursUsed);
        const hourDiff = newHours - oldHours;

        if (hourDiff !== 0 && oldData.bono_id) {
            const { data: bono, error: bonoError } = await supabase
                .from('bonos')
                .select('hours_remaining, hours_used')
                .eq('id', oldData.bono_id)
                .single();

            if (bonoError) throw bonoError;

            if (bono) {
                await supabase
                    .from('bonos')
                    .update({
                        hours_remaining: safeParseFloat(bono.hours_remaining) - hourDiff,
                        hours_used: safeParseFloat(bono.hours_used) + hourDiff,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', oldData.bono_id);
            }
        }

        const dbData = {
            ...mapInterventionToDb(interventionData),
            updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
            .from('interventions')
            .update(dbData)
            .eq('id', id);

        if (updateError) throw updateError;

        return {
            id,
            ...mapInterventionFromDb({ ...oldData, ...dbData })
        };
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
            const { data: bono, error: bonoError } = await supabase
                .from('bonos')
                .select('hours_used, hours_remaining, hours, status')
                .eq('id', interventionData.bonoId)
                .single();

            if (bonoError) throw bonoError;

            if (bono) {
                const newHoursUsed = Math.max(0, safeParseFloat(bono.hours_used) - interventionData.hoursUsed);
                const newHoursRemaining = safeParseFloat(bono.hours) - newHoursUsed;

                await supabase
                    .from('bonos')
                    .update({
                        hours_used: newHoursUsed,
                        hours_remaining: newHoursRemaining,
                        status: newHoursRemaining > 0 ? 'active' : bono.status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', interventionData.bonoId);
            }
        }

        // Then delete the intervention
        const { error } = await supabase
            .from('interventions')
            .delete()
            .eq('id', id);

        if (error) throw error;
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
        const { data, error } = await supabase
            .from('punctual_interventions')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapPunctualFromDb);
    } catch (error) {
        console.error('Error getting punctual interventions:', error);
        throw error;
    }
};

// Get punctual interventions by client
export const getPunctualInterventionsByClient = async (clientId) => {
    try {
        const { data, error } = await supabase
            .from('punctual_interventions')
            .select('*')
            .eq('client_id', clientId)
            .order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapPunctualFromDb);
    } catch (error) {
        console.error('Error getting punctual interventions by client:', error);
        throw error;
    }
};

// Add punctual intervention
export const addPunctualIntervention = async (data) => {
    try {
        const id = uuidv4();
        const dbData = {
            id,
            ...mapPunctualToDb(data),
            created_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('punctual_interventions')
            .insert([dbData]);

        if (error) throw error;
        return {
            id,
            ...data
        };
    } catch (error) {
        console.error('Error adding punctual intervention:', error);
        throw error;
    }
};

// Update punctual intervention
export const updatePunctualIntervention = async (id, data) => {
    try {
        const dbData = {
            ...mapPunctualToDb(data),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('punctual_interventions')
            .update(dbData)
            .eq('id', id);

        if (error) throw error;

        return {
            id,
            ...data
        };
    } catch (error) {
        console.error('Error updating punctual intervention:', error);
        throw error;
    }
};

// Delete punctual intervention
export const deletePunctualIntervention = async (id) => {
    try {
        const { error } = await supabase
            .from('punctual_interventions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting punctual intervention:', error);
        throw error;
    }
};
