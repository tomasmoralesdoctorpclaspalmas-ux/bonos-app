import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBonosByClient, getInterventionsByClient } from '../db';

export default function ClientDashboard() {
    const [bonos, setBonos] = useState([]);
    const [interventions, setInterventions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('bonos');

    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            loadData();
        }
    }, [currentUser]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [bonosData, interventionsData] = await Promise.all([
                getBonosByClient(currentUser.uid),
                getInterventionsByClient(currentUser.uid)
            ]);
            setBonos(bonosData);
            setInterventions(interventionsData);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const totalHours = bonos.reduce((sum, b) => sum + (b.hours || 0), 0);
    const usedHours = bonos.reduce((sum, b) => sum + (b.hoursUsed || 0), 0);
    const remainingHours = bonos.reduce((sum, b) => sum + (b.hoursRemaining || b.hours || 0), 0);
    const activeBonos = bonos.filter(b => b.status === 'active').length;

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-xl text-gray-700">Cargando información...</p>
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
                            <h1 className="text-3xl font-bold text-gray-900">🎫 Mi Portal de Bonos</h1>
                            <p className="text-gray-600 mt-1">Bienvenido, {currentUser?.name}</p>
                            {currentUser?.companyName && (
                                <p className="text-sm text-gray-500">{currentUser.companyName}</p>
                            )}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all"
                        >
                            🚪 Salir
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg"
                    >
                        <div className="text-3xl mb-2">⏱️</div>
                        <div className="text-3xl font-bold mb-1">{totalHours}h</div>
                        <div className="text-sm opacity-90">Horas Totales</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg"
                    >
                        <div className="text-3xl mb-2">💎</div>
                        <div className="text-3xl font-bold mb-1">{remainingHours}h</div>
                        <div className="text-sm opacity-90">Horas Disponibles</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-lg"
                    >
                        <div className="text-3xl mb-2">✔️</div>
                        <div className="text-3xl font-bold mb-1">{usedHours}h</div>
                        <div className="text-sm opacity-90">Horas Usadas</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg"
                    >
                        <div className="text-3xl mb-2">📊</div>
                        <div className="text-3xl font-bold mb-1">{activeBonos}</div>
                        <div className="text-sm opacity-90">Bonos Activos</div>
                    </motion.div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('bonos')}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'bonos'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        📋 Mis Bonos
                    </button>
                    <button
                        onClick={() => setActiveTab('interventions')}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'interventions'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        🔧 Historial de Intervenciones
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'bonos' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bonos.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                                <p className="text-2xl text-gray-400 mb-2">📭</p>
                                <p className="text-xl text-gray-600">No tienes bonos registrados</p>
                            </div>
                        ) : (
                            bonos.map((bono) => (
                                <motion.div
                                    key={bono.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-bold text-gray-800">{bono.service}</h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${bono.status === 'active'
                                            ? 'bg-green-100 text-green-800'
                                            : bono.status === 'depleted'
                                                ? 'bg-orange-100 text-orange-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {bono.status === 'active' ? 'Activo' : bono.status === 'depleted' ? 'Agotado' : 'Expirado'}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Horas totales:</span>
                                            <span className="font-bold">{bono.hours}h</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Horas restantes:</span>
                                            <span className="font-bold text-green-600">{bono.hoursRemaining || bono.hours}h</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Expiración:</span>
                                            <span className="text-sm">
                                                {bono.neverExpires ? '♾️ Nunca' : new Date(bono.expiryDate).toLocaleDateString('es-ES')}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        {interventions.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-2xl text-gray-400 mb-2">🔧</p>
                                <p className="text-xl text-gray-600">No hay intervenciones registradas</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evidencias</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {interventions.map((intervention) => (
                                        <tr key={intervention.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(intervention.date).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">
                                                -{intervention.hoursUsed}h
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <div className="max-w-xs overflow-hidden text-ellipsis">
                                                    {intervention.notes || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {intervention.images && intervention.images.length > 0 ? (
                                                    <div className="flex gap-1 overflow-x-auto max-w-[150px] pb-1">
                                                        {intervention.images.map((img, idx) => (
                                                            <img
                                                                key={idx}
                                                                src={img}
                                                                alt="Evidencia"
                                                                className="h-10 w-10 object-cover rounded cursor-pointer hover:opacity-80"
                                                                onClick={() => window.open(img, '_blank')}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
