import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUsers, deleteUser, updateUser } from '../db';
import { createUserAccount, sendPasswordReset } from '../auth';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'client',
        phone: '',
        companyName: ''
    });
    const [editingUser, setEditingUser] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error('Error loading users:', err);
            setError('Error al cargar usuarios');
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
                    companyName: formData.companyName
                });
                setSuccess('Usuario actualizado correctamente');
            } else {
                // Create user in Firebase Auth
                await createUserAccount(formData.email, formData.password, {
                    name: formData.name,
                    role: formData.role,
                    phone: formData.phone,
                    companyName: formData.companyName
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
                setError('Error al procesar la solicitud. Intenta nuevamente.');
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
            companyName: ''
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
            companyName: user.companyName || ''
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
                            <button
                                onClick={() => {
                                    if (showForm) resetForm();
                                    else setShowForm(true);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all"
                            >
                                {showForm ? '❌ Cancelar' : '➕ Nuevo Usuario'}
                            </button>
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
                                        {editingUser ? 'Nueva Contraseña (vía Email)' : 'Contraseña *'}
                                    </label>
                                    <div className="flex gap-2">
                                        {editingUser ? (
                                            <button
                                                type="button"
                                                onClick={() => handleResetPassword(editingUser.email)}
                                                className="w-full py-2 px-4 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                                            >
                                                📧 Enviar enlace de cambio de clave
                                            </button>
                                        ) : (
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required={!editingUser}
                                                minLength={6}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="Mínimo 6 caracteres"
                                            />
                                        )}
                                    </div>
                                    {editingUser && (
                                        <p className="text-xs text-gray-500 mt-1">Por seguridad, el administrador envía un enlace para que el usuario elija su clave.</p>
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
                                    <input
                                        type="text"
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Nombre de la empresa"
                                    />
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
            </main>
        </div>
    );
}
