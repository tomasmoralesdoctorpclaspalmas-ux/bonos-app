import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Dashboard from '../components/Dashboard';
import BonoForm from '../components/BonoForm';
import BonoCard from '../components/BonoCard';
import ClientHistory from '../components/ClientHistory';
import { getBonos, addBono, updateBono, deleteBono, checkExpiredBonos } from '../db';

export default function AdminDashboard() {
    const [bonos, setBonos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBono, setEditingBono] = useState(null);
    const [filter, setFilter] = useState('all');
    const [error, setError] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [viewHistoryClient, setViewHistoryClient] = useState(null);

    const { logout, currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadBonos();
    }, []);

    const loadBonos = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getBonos();
            const updatedData = checkExpiredBonos(data);
            setBonos(updatedData);
        } catch (err) {
            console.error('Error loading bonos:', err);
            setError('Error al cargar los bonos. Verifica tu configuración de Firebase.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBono = async (bonoData) => {
        try {
            setError(null);
            const newBono = await addBono(bonoData);
            setBonos(prev => [newBono, ...prev]);
            setShowForm(false);
        } catch (err) {
            console.error('Error adding bono:', err);
            setError('Error al crear el bono. Intenta nuevamente.');
        }
    };

    const handleUpdateBono = async (bonoData) => {
        try {
            setError(null);
            const updated = await updateBono(editingBono.id, bonoData);
            setBonos(prev => prev.map(b => b.id === editingBono.id ? updated : b));
            setEditingBono(null);
            setShowForm(false);
        } catch (err) {
            console.error('Error updating bono:', err);
            setError('Error al actualizar el bono. Intenta nuevamente.');
        }
    };

    const handleDeleteBono = async (id) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este bono?')) return;

        try {
            setError(null);
            await deleteBono(id);
            setBonos(prev => prev.filter(b => b.id !== id));
        } catch (err) {
            console.error('Error deleting bono:', err);
            setError('Error al eliminar el bono. Intenta nuevamente.');
        }
    };

    const handleEdit = (bono) => {
        setEditingBono(bono);
        setShowForm(true);
    };

    const handleViewHistory = (bono) => {
        setViewHistoryClient({
            uid: bono.clientId,
            name: bono.clientName
        });
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingBono(null);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const filteredBonos = bonos.filter(bono => {
        if (filter === 'all') return true;
        return bono.status === filter;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-xl text-gray-700">Cargando bonos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white shadow-md z-1 relative">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">🎫 Control de Bonos - Admin</h1>
                            <p className="text-gray-600 mt-1">Bienvenido, {currentUser?.name || currentUser?.email}</p>
                        </div>
                        <div className="flex gap-3 items-center">
                            <button
                                onClick={() => navigate('/admin/users')}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all"
                            >
                                👥 Gestión de Usuarios
                            </button>

                            {/* Action Menu (Nuevo Bono / Asistencia) */}
                            <div
                                className="relative"
                                onMouseEnter={() => setShowMenu(true)}
                                onMouseLeave={() => setShowMenu(false)}
                            >
                                <button
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all flex items-center gap-2"
                                >
                                    ➕ Acciones
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                <AnimatePresence>
                                    {showMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute right-0 mt-0 w-56 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-20"
                                        >
                                            <button
                                                onClick={() => {
                                                    setShowForm(true);
                                                    setShowMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 flex items-center gap-2 transition-colors border-b border-gray-100"
                                            >
                                                <span>🎫</span> Nuevo Bono
                                            </button>
                                            <button
                                                onClick={() => navigate('/admin/register-intervention')}
                                                className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 flex items-center gap-2 transition-colors"
                                            >
                                                <span>🛠️</span> Registrar Asistencia
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

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

                {/* Dashboard */}
                <Dashboard bonos={bonos} />

                {/* Form */}
                <AnimatePresence>
                    {showForm && (
                        <BonoForm
                            bono={editingBono}
                            onSubmit={editingBono ? handleUpdateBono : handleAddBono}
                            onCancel={handleCancelForm}
                        />
                    )}
                </AnimatePresence>

                {/* Client History Modal */}
                <AnimatePresence>
                    {viewHistoryClient && (
                        <ClientHistory
                            client={viewHistoryClient}
                            onClose={() => setViewHistoryClient(null)}
                        />
                    )}
                </AnimatePresence>

                {/* Filter Buttons */}
                <div className="flex gap-3 mb-6 flex-wrap">
                    {[
                        { value: 'all', label: 'Todos', icon: '📊' },
                        { value: 'active', label: 'Activos', icon: '✅' },
                        { value: 'depleted', label: 'Agotados', icon: '⚠️' },
                        { value: 'expired', label: 'Expirados', icon: '⏰' }
                    ].map(({ value, label, icon }) => (
                        <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === value
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {icon} {label}
                        </button>
                    ))}
                </div>

                {/* Bonos List */}
                {filteredBonos.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 bg-white rounded-lg shadow"
                    >
                        <p className="text-2xl text-gray-400 mb-2">📭</p>
                        <p className="text-xl text-gray-600">
                            {filter === 'all'
                                ? 'No hay bonos registrados. ¡Crea tu primer bono!'
                                : `No hay bonos ${filter === 'active' ? 'activos' : filter === 'depleted' ? 'agotados' : 'expirados'}`}
                        </p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {filteredBonos.map(bono => (
                                <BonoCard
                                    key={bono.id}
                                    bono={bono}
                                    onEdit={handleEdit}
                                    onViewHistory={handleViewHistory}
                                    onDelete={handleDeleteBono}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>
        </div>
    );
}

