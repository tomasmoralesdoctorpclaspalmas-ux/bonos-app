import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Dashboard from '../components/Dashboard';
import BonoForm from '../components/BonoForm';
import BonoCard from '../components/BonoCard';
import ClientHistory from '../components/ClientHistory';
import EmpresaForm from '../components/EmpresaForm';
import QuickUserForm from '../components/QuickUserForm';
import ResumenHoras from '../components/ResumenHoras';
import { getBonos, addBono, updateBono, deleteBono, checkExpiredBonos, getPunctualInterventions, updatePunctualIntervention, deletePunctualIntervention, getInterventions, getUsers, getEmpresas } from '../db';
import InterventionEditModal from '../components/InterventionEditModal';

export default function AdminDashboard() {
    const [bonos, setBonos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showBonoForm, setShowBonoForm] = useState(false);
    const [showEmpresaForm, setShowEmpresaForm] = useState(false);
    const [showClientForm, setShowClientForm] = useState(false);
    const [selectedBono, setSelectedBono] = useState(null);
    const [filter, setFilter] = useState('all');
    const [error, setError] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [viewHistoryClient, setViewHistoryClient] = useState(null);
    const [punctualInterventions, setPunctualInterventions] = useState([]);
    const [editingPunctual, setEditingPunctual] = useState(null);
    const [users, setUsers] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [interventions, setInterventions] = useState([]);

    const { logout, currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadBonos();
    }, []);

    const loadBonos = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load all data in parallel
            const [bonosData, punctualData, interventionsData, usersData, empresasData] = await Promise.all([
                getBonos(),
                getPunctualInterventions(),
                getInterventions().catch(() => []),
                getUsers().catch(() => []),
                getEmpresas().catch(() => [])
            ]);

            const updatedBonos = checkExpiredBonos(bonosData);
            setBonos(updatedBonos);
            setPunctualInterventions(punctualData);
            setInterventions(interventionsData);
            setUsers(usersData);
            setEmpresas(empresasData);
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Error al cargar la información. Verifica tu configuración de Supabase.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBono = async (bonoData) => {
        try {
            setError(null);
            const newBono = await addBono(bonoData);
            setBonos(prev => [newBono, ...prev]);
            setShowBonoForm(false);
        } catch (err) {
            console.error('Error adding bono:', err);
            setError('Error al crear el bono. Intenta nuevamente.');
        }
    };

    const handleUpdateBono = async (bonoData) => {
        try {
            setError(null);
            const updated = await updateBono(selectedBono.id, bonoData);
            setBonos(prev => prev.map(b => b.id === selectedBono.id ? updated : b));
            setSelectedBono(null);
            setShowBonoForm(false);
        } catch (err) {
            console.error('Error updating bono:', err);
            setError('Error al actualizar el bono. Intenta nuevamente.');
        }
    };

    const handleDeleteBono = async (id) => {
        const bono = bonos.find(b => b.id === id);
        if (!confirm(`¿Estás seguro de que deseas eliminar el bono de "${bono.clientName}"?`)) return;
        if (!confirm('ESTA ACCIÓN ES IRREVERSIBLE. Se perderán todos los datos del bono. ¿Confirmar eliminación definitiva?')) return;

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
        setSelectedBono(bono);
        setShowBonoForm(true);
    };

    const handleViewHistory = (bono) => {
        setViewHistoryClient({
            uid: bono.clientId,
            name: bono.clientName
        });
    };

    const handleCancelForm = () => {
        setShowBonoForm(false);
        setSelectedBono(null);
    };

    const handleDeletePunctual = async (id) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta asistencia puntual?')) return;

        try {
            setError(null);
            await deletePunctualIntervention(id);
            setPunctualInterventions(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error('Error deleting punctual:', err);
            setError('Error al eliminar la asistencia puntual.');
        }
    };

    const handleEditPunctual = (item) => {
        setEditingPunctual(item);
    };

    const handleSavePunctual = async (changes) => {
        try {
            setError(null);
            await updatePunctualIntervention(editingPunctual.id, changes);
            setPunctualInterventions(prev => prev.map(p => p.id === editingPunctual.id ? { ...p, ...changes } : p));
            setEditingPunctual(null);
        } catch (err) {
            console.error('Error updating punctual:', err);
            setError('Error al actualizar la asistencia puntual.');
        }
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
                                                    setShowBonoForm(true);
                                                    setShowMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 flex items-center gap-2 transition-colors border-b border-gray-100"
                                            >
                                                <span>🎫</span> Nuevo Bono
                                            </button>
                                            <button
                                                onClick={() => navigate('/admin/register-intervention')}
                                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 border-b border-gray-50"
                                            >
                                                📋 Registrar Intervención
                                            </button>
                                            <button
                                                onClick={() => navigate('/admin/register-punctual')}
                                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center gap-2 border-b border-gray-50"
                                            >
                                                ⚡ Asistencia Puntual
                                            </button>
                                            <div className="border-t border-gray-200 my-1"></div>
                                            <button
                                                onClick={() => {
                                                    setShowEmpresaForm(true);
                                                    setShowMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                            >
                                                🏢 Registrar Empresa
                                            </button>
                                            <button
                                                onClick={() => { setShowClientForm(true); setShowMenu(false); }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                            >
                                                👤 Añadir Cliente
                                            </button>
                                            <div className="border-t border-gray-100 my-1"></div>
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
                    {showBonoForm && (
                        <BonoForm
                            bono={selectedBono}
                            onSubmit={selectedBono ? handleUpdateBono : handleAddBono}
                            onCancel={handleCancelForm}
                        />
                    )}
                </AnimatePresence>

                {/* Empresa Form Modal */}
                <AnimatePresence>
                {showEmpresaForm && (
                    <EmpresaForm
                        onCancel={() => setShowEmpresaForm(false)}
                        onSuccess={() => {
                            setShowEmpresaForm(false);
                            alert('Empresa registrada con éxito.');
                        }}
                    />
                )}
                {showClientForm && (
                    <QuickUserForm
                        onCancel={() => setShowClientForm(false)}
                        onSuccess={() => {
                            setShowClientForm(false);
                            alert('Cliente registrado con éxito.');
                        }}
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
                        { value: 'expired', label: 'Expirados', icon: '⏰' },
                        { value: 'punctual', label: 'Puntuales', icon: '⚡' },
                        { value: 'resumen', label: 'Control de Horas', icon: '⏱️' }
                    ].map(({ value, label, icon }) => (
                        <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === value
                                ? (value === 'punctual' ? 'bg-orange-600 text-white shadow-lg' : value === 'resumen' ? 'bg-teal-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-lg')
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {icon} {label}
                        </button>
                    ))}
                </div>

                {/* Bonos List, Punctual History, or Resumen de Horas */}
                {filter === 'resumen' ? (
                    <ResumenHoras
                        users={users}
                        empresas={empresas}
                        interventions={interventions}
                        punctualInterventions={punctualInterventions}
                    />
                ) : filter === 'punctual' ? (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-orange-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Cliente/Firma</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Horario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Horas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Observaciones</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Evidencias</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-orange-800 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {punctualInterventions.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-10 text-center text-gray-500 italic">
                                                No hay asistencias puntuales registradas.
                                            </td>
                                        </tr>
                                    ) : (
                                        punctualInterventions.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                    {new Date(item.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {item.clientName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : (item.startTime || item.endTime || '-')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">
                                                        {item.hours}h
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                    {item.notes || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex -space-x-2">
                                                        {item.images?.map((img, i) => (
                                                            <a key={i} href={img} target="_blank" rel="noreferrer" className="block transform hover:scale-110 transition-transform">
                                                                <img src={img} alt="evidencia" className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm" />
                                                            </a>
                                                        ))}
                                                        {(!item.images || item.images.length === 0) && '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-3">
                                                        <button
                                                            onClick={() => handleEditPunctual(item)}
                                                            className="text-orange-600 hover:text-orange-900 bg-orange-50 px-2 py-1 rounded"
                                                            title="Editar asistencia"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePunctual(item.id)}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded"
                                                            title="Eliminar"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : filteredBonos.length === 0 ? (
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

            {/* Edit Punctual Modal */}
            <AnimatePresence>
                {editingPunctual && (
                    <InterventionEditModal
                        intervention={editingPunctual}
                        onSave={handleSavePunctual}
                        onCancel={() => setEditingPunctual(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

