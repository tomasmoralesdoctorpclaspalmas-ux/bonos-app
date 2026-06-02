import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUsers, deleteUser, updateUser, getEmpresas, updateEmpresa, deleteEmpresa, addEmpresa } from '../db';
import { createUserAccount, sendPasswordReset, auth } from '../auth';


export default function UserManagement() {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    
    // User states
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Empresa states
    const [showEmpresaForm, setShowEmpresaForm] = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState(null);
    const [empresaFormData, setEmpresaFormData] = useState({ name: '' });
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'client',
        phone: '',
        companyName: '',
        empresaId: ''
    });
    const [editingUser, setEditingUser] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [passwordChangeUser, setPasswordChangeUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);


    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const [usersData, empresasData] = await Promise.all([
                getUsers(),
                getEmpresas()
            ]);
            setUsers(usersData);
            setEmpresas(empresasData);
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Error al cargar datos: ' + (err.message || 'Desconocido'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            if (editingUser) {
                // Update existing user in Firestore
                await updateUser(editingUser.uid, {
                    name: formData.name,
                    role: formData.role,
                    phone: formData.phone,
                    companyName: formData.companyName,
                    empresaId: formData.empresaId
                });

                // If password is provided, update it directly via API
                if (formData.password && formData.password.trim() !== '') {
                    if (formData.password.length < 6) {
                        setError('La contraseña debe tener al menos 6 caracteres');
                        return;
                    }
                    
                    const currentUser = auth.currentUser;
                    if (!currentUser) {
                        throw new Error('No has iniciado sesión o la sesión ha expirado.');
                    }
                    const idToken = await currentUser.getIdToken(true);

                    const response = await fetch('/api/change-password', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                            targetUid: editingUser.uid,
                            newPassword: formData.password
                        })
                    });

                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.error || 'Error al cambiar la contraseña directamente');
                    }
                }

                setSuccess('Usuario actualizado correctamente');
            } else {
                // Create user in Firebase Auth
                await createUserAccount(formData.email, formData.password, {
                    name: formData.name,
                    role: formData.role,
                    phone: formData.phone,
                    companyName: formData.companyName,
                    empresaId: formData.empresaId
                });
                setSuccess('Usuario creado correctamente');
            }

            // Reload users
            await loadUsers();

            // Reset form
            resetForm();
        } catch (err) {
            console.error('Error in user management:', err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Este email ya está en uso');
            } else if (err.code === 'auth/weak-password') {
                setError('La contraseña debe tener al menos 6 caracteres');
            } else {
                setError(err.message || 'Error al procesar la solicitud. Intenta nuevamente.');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            name: '',
            role: 'client',
            phone: '',
            companyName: '',
            empresaId: ''
        });
        setEditingUser(null);
        setShowForm(false);
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '', // Password cannot be edited directly
            name: user.name,
            role: user.role,
            phone: user.phone || '',
            companyName: user.companyName || '',
            empresaId: user.empresaId || ''
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleResetPassword = async (email) => {
        if (!confirm(`¿Enviar email de restablecimiento de contraseña a ${email}?`)) return;

        try {
            await sendPasswordReset(email);
            setSuccess(`Email de restablecimiento enviado a ${email}`);
        } catch (err) {
            console.error('Error sending reset email:', err);
            setError('Error al enviar el email de restablecimiento');
        }
    };

    const handleDirectPasswordChange = async (e) => {
        e.preventDefault();
        if (!passwordChangeUser) return;
        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setChangingPassword(true);
        setError('');
        setSuccess('');

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('No has iniciado sesión o la sesión ha expirado.');
            }
            const idToken = await currentUser.getIdToken(true);

            const response = await fetch('/api/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    targetUid: passwordChangeUser.uid,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al cambiar la contraseña');
            }

            setSuccess(`Contraseña de ${passwordChangeUser.name} actualizada correctamente.`);
            setPasswordChangeUser(null);
            setNewPassword('');
        } catch (err) {
            console.error('Error direct password change:', err);
            setError(err.message || 'Error al actualizar la contraseña.');
        } finally {
            setChangingPassword(false);
        }
    };


    const handleDelete = async (uid) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

        try {
            await deleteUser(uid);
            setUsers(prev => prev.filter(u => u.uid !== uid));
        } catch (err) {
            console.error('Error deleting user:', err);
            setError('Error al eliminar usuario');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Empresa Methods
    const handleEditEmpresa = (emp) => {
        setEditingEmpresa(emp);
        setEmpresaFormData({ name: emp.name });
        setShowEmpresaForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteEmpresa = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta empresa? Los bonos y asistencias asociados perderán la referencia al nombre de la empresa.')) return;
        try {
            await deleteEmpresa(id);
            setEmpresas(prev => prev.filter(e => e.id !== id));
            setSuccess('Empresa eliminada correctamente');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
            setError('Error al eliminar la empresa');
        }
    };

    const handleSaveEmpresa = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError('');
            if (editingEmpresa) {
                const updated = await updateEmpresa(editingEmpresa.id, { name: empresaFormData.name });
                setEmpresas(prev => prev.map(emp => emp.id === editingEmpresa.id ? updated : emp));
                setSuccess('Empresa actualizada correctamente');
            } else {
                const newEmpresa = await addEmpresa({ name: empresaFormData.name });
                setEmpresas(prev => [...prev, newEmpresa]);
                setSuccess('Empresa creada correctamente');
            }
            setTimeout(() => setSuccess(''), 3000);
            
            setShowEmpresaForm(false);
            setEditingEmpresa(null);
            setEmpresaFormData({ name: '' });
        } catch (err) {
            console.error(err);
            setError('Error al guardar la empresa');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-xl text-gray-700">Cargando usuarios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">👥 Gestión de Usuarios</h1>
                            <p className="text-gray-600 mt-1">Administra usuarios y permisos</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/admin')}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all"
                            >
                                🎫 Bonos
                            </button>
                            {activeTab === 'users' ? (
                                <button
                                    onClick={() => {
                                        if (showForm) resetForm();
                                        else setShowForm(true);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all"
                                >
                                    {showForm ? '❌ Cancelar' : '➕ Nuevo Usuario'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (showEmpresaForm) {
                                            setShowEmpresaForm(false);
                                            setEditingEmpresa(null);
                                            setEmpresaFormData({ name: '' });
                                        } else {
                                            setShowEmpresaForm(true);
                                        }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all"
                                >
                                    {showEmpresaForm ? '❌ Cancelar' : '🏢 Nueva Empresa'}
                                </button>
                            )}
                            <button
                                onClick={handleLogout}
                                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all"
                            >
                                🚪 Salir
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Success Message */}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6"
                    >
                        <p className="font-semibold">✅ {success}</p>
                    </motion.div>
                )}

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6"
                    >
                        <p className="font-semibold">⚠️ {error}</p>
                    </motion.div>
                )}

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'users'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                            }`}
                    >
                        👥 Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab('empresas')}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'empresas'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                            }`}
                    >
                        🏢 Empresas
                    </button>
                </div>

                {activeTab === 'users' && (
                    <>
                        {/* Create User Form */}
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-lg shadow-lg p-6 mb-6"
                    >
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">
                            {editingUser ? `Editando: ${editingUser.name}` : 'Crear Nuevo Usuario'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Juan Pérez"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        disabled={!!editingUser}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${editingUser ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        placeholder="usuario@email.com"
                                    />
                                    {editingUser && (
                                        <p className="text-xs text-gray-500 mt-1">El email no se puede cambiar directamente.</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {editingUser ? 'Nueva Contraseña (directa)' : 'Contraseña *'}
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!editingUser}
                                        minLength={6}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder={editingUser ? "Dejar en blanco para no modificar" : "Mínimo 6 caracteres"}
                                    />
                                    {editingUser && (
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-xs text-gray-500">Se cambiará directamente al guardar.</p>
                                            <button
                                                type="button"
                                                onClick={() => handleResetPassword(editingUser.email)}
                                                className="text-xs text-orange-600 hover:text-orange-850 font-semibold underline"
                                            >
                                                O enviar enlace por email
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Rol *
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="client">Cliente</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="+34 123 456 789"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Empresa (para clientes)
                                    </label>
                                    <select
                                        value={formData.empresaId || ''}
                                        onChange={(e) => {
                                            const selectedId = e.target.value;
                                            const selectedEmpresa = empresas.find(emp => emp.id === selectedId);
                                            setFormData({ 
                                                ...formData, 
                                                empresaId: selectedId,
                                                companyName: selectedEmpresa ? selectedEmpresa.name : ''
                                            });
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Ninguna / Cliente Particular</option>
                                        {empresas.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className={`w-full font-bold py-3 px-4 rounded-lg transition-colors ${editingUser ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                            >
                                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                            </button>
                        </form>
                    </motion.div>
                )}

                {/* Users List */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Usuario
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rol
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Teléfono
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Empresa
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.uid}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-green-100 text-green-800'
                                            }`}>
                                            {user.role === 'admin' ? 'Admin' : 'Cliente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.phone || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.companyName || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-3">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPasswordChangeUser(user);
                                                setNewPassword('');
                                                setShowPassword(false);
                                            }}
                                            className="text-amber-600 hover:text-amber-900"
                                        >
                                            🔑 Clave
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.uid)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                    </>
                )}

                {activeTab === 'empresas' && (
                    <>
                        {/* Create/Edit Empresa Form */}
                        {showEmpresaForm && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-lg shadow-lg p-6 mb-6"
                            >
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                                    {editingEmpresa ? `Editando: ${editingEmpresa.name}` : 'Crear Nueva Empresa'}
                                </h2>

                                <form onSubmit={handleSaveEmpresa} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nombre de la empresa *
                                        </label>
                                        <input
                                            type="text"
                                            value={empresaFormData.name}
                                            onChange={(e) => setEmpresaFormData({ name: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ej: Acme Corp S.A."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className={`w-full font-bold py-3 px-4 rounded-lg transition-colors ${editingEmpresa ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                                    >
                                        {editingEmpresa ? 'Guardar Cambios' : 'Crear Empresa'}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* Empresas List */}
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Empresa
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {empresas.map((emp) => (
                                        <tr key={emp.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-3">
                                                <button
                                                    onClick={() => handleEditEmpresa(emp)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEmpresa(emp.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    🗑️ Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {empresas.length === 0 && (
                                        <tr>
                                            <td colSpan="2" className="px-6 py-4 text-center text-gray-500">
                                                No hay empresas registradas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Password Change Modal */}
                <AnimatePresence>
                    {passwordChangeUser && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                            <span>🔑</span> Cambiar Contraseña
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Usuario: <span className="font-semibold text-gray-700">{passwordChangeUser.name}</span>
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Email: {passwordChangeUser.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setPasswordChangeUser(null)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <form onSubmit={handleDirectPasswordChange} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            Nueva Contraseña
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                                minLength={6}
                                                autoFocus
                                                placeholder="Mínimo 6 caracteres"
                                                className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-950 font-medium"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? (
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                    </svg>
                                                ) : (
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">La nueva contraseña se guardará inmediatamente en Firebase Auth.</p>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setPasswordChangeUser(null)}
                                            disabled={changingPassword}
                                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl transition-colors border border-gray-200"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={changingPassword}
                                            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {changingPassword ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Guardando...
                                                </>
                                            ) : (
                                                'Guardar Clave'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
