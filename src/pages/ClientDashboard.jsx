import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getBonos,
    getInterventions,
    getPunctualInterventions,
    getEmpresas
} from '../db';

// ─── helpers para filtrado difuso idénticos al panel del administrador ───
const toNum = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
};

const normalize = (s) => (s || '').toLowerCase().trim();

const nameMatch = (a, b) => {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.length >= 4 && nb.includes(na)) return true;
    if (nb.length >= 4 && na.includes(nb)) return true;
    return false;
};

const belongsToUser = (item, user, empresas) => {
    if (!user) return false;
    // 1. Coincidencia directa de ID
    if (item.clientId && item.clientId === user.uid) return true;

    // 2. Coincidencia por nombre del usuario
    const clientName = item.clientName || '';
    if (nameMatch(clientName, user.name)) return true;

    // 3. Coincidencia por empresa asignada
    if (user.empresaId && item.clientId && item.clientId === user.empresaId) return true;

    // 4. Coincidencia por nombre de la empresa del usuario
    if (user.empresaId) {
        const userEmpresa = empresas.find(e => e.id === user.empresaId);
        if (userEmpresa && nameMatch(clientName, userEmpresa.name)) return true;
    }

    return false;
};

export default function ClientDashboard() {
    const [bonos, setBonos] = useState([]);
    const [interventions, setInterventions] = useState([]);
    const [punctualInterventions, setPunctualInterventions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('resumen');

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

            const [allBonos, allInterventions, allPunctuals, allEmpresas] = await Promise.all([
                getBonos(),
                getInterventions().catch(err => {
                    console.error('Error loading interventions:', err);
                    return [];
                }),
                getPunctualInterventions().catch(err => {
                    console.error('Error loading punctual:', err);
                    return [];
                }),
                getEmpresas().catch(err => {
                    console.error('Error loading empresas:', err);
                    return [];
                })
            ]);

            // Filtrar todos del lado del cliente para garantizar 100% de paridad con admin
            const filteredBonos = allBonos.filter(b => belongsToUser(b, currentUser, allEmpresas));
            
            const filteredInterventions = allInterventions
                .filter(i => belongsToUser(i, currentUser, allEmpresas))
                .map(i => ({
                    ...i,
                    date: i.date && typeof i.date !== 'string' && i.date.toDate ? i.date.toDate().toISOString() : i.date
                }));

            const filteredPunctuals = allPunctuals
                .filter(p => belongsToUser(p, currentUser, allEmpresas))
                .map(p => ({
                    ...p,
                    date: p.date && typeof p.date !== 'string' && p.date.toDate ? p.date.toDate().toISOString() : p.date
                }));

            setBonos(filteredBonos);
            setInterventions(filteredInterventions);
            setPunctualInterventions(filteredPunctuals);
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

    // ── totales ────────────────────────────────────────────────────────────
    const totalBonoHours = bonos.reduce((sum, b) => sum + (parseFloat(b.hours) || 0), 0);
    const activeBonos = bonos.filter(b => b.status === 'active').length;
    const remainingHours = bonos.reduce((sum, b) => sum + (parseFloat(b.hoursRemaining ?? b.hours) || 0), 0);

    // Horas consumidas de bono (intervenciones sobre bono)
    const bonoUsedHours = interventions.reduce((sum, i) => sum + (parseFloat(i.hoursUsed) || 0), 0);
    // Horas de asistencias puntuales
    const totalPunctualHours = punctualInterventions.reduce((sum, p) => sum + (parseFloat(p.hours) || 0), 0);
    // TOTAL combinado — equivalente exacto al que muestra el admin en "Control de Horas"
    const totalConsumedHours = bonoUsedHours + totalPunctualHours;

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

                {/* ── Tarjeta principal: Total horas consumidas ── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-xl p-6 shadow-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-4">
                        <span className="text-5xl">⏱️</span>
                        <div>
                            <p className="text-sm font-semibold opacity-80 uppercase tracking-widest">Total horas de asistencia</p>
                            <p className="text-xs opacity-60 mt-0.5">
                                {bonoUsedHours}h de bonos + {totalPunctualHours}h puntuales
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-6xl font-extrabold leading-none">{totalConsumedHours}h</p>
                        <p className="text-xs opacity-70 mt-1">{interventions.length + punctualInterventions.length} asistencias en total</p>
                    </div>
                </motion.div>

                {/* ── Statistics Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg"
                    >
                        <div className="text-3xl mb-2">📦</div>
                        <div className="text-3xl font-bold mb-1">{totalBonoHours}h</div>
                        <div className="text-sm opacity-90">Horas en Bonos</div>
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
                        <div className="text-3xl mb-2">⚡</div>
                        <div className="text-3xl font-bold mb-1">{totalPunctualHours}h</div>
                        <div className="text-sm opacity-90">Horas Puntuales</div>
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

                {/* ── Tabs ── */}
                <div className="flex gap-3 mb-6 flex-wrap">
                    {[
                        { key: 'resumen', label: '📋 Resumen', color: 'blue' },
                        { key: 'bonos', label: '🎫 Mis Bonos', color: 'blue' },
                        { key: 'interventions', label: '🔧 Historial Bonos', color: 'blue' },
                        { key: 'punctual', label: '⚡ Asistencias Puntuales', color: 'orange' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`px-5 py-2.5 rounded-lg font-semibold transition-all text-sm ${activeTab === key
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Resumen combinado ── */}
                {activeTab === 'resumen' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-blue-700 px-6 py-4">
                                <h2 className="text-white font-bold text-lg">📋 Todas las asistencias registradas</h2>
                                <p className="text-blue-200 text-sm mt-0.5">Bonos e intervenciones puntuales combinadas</p>
                            </div>
                            {interventions.length === 0 && punctualInterventions.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <p className="text-3xl mb-2">📭</p>
                                    <p>No hay asistencias registradas todavía.</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {[
                                            ...interventions.map(i => ({ ...i, _tipo: 'bono', _horas: parseFloat(i.hoursUsed) || 0 })),
                                            ...punctualInterventions.map(p => ({ ...p, _tipo: 'puntual', _horas: parseFloat(p.hours) || 0 }))
                                        ]
                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                                            .map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${item._tipo === 'bono'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-orange-100 text-orange-800'
                                                            }`}>
                                                            {item._tipo === 'bono' ? '🎫 Bono' : '⚡ Puntual'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : (item.startTime || item.endTime || '-')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`text-sm font-bold px-2.5 py-1 rounded ${item._tipo === 'bono'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-orange-100 text-orange-800'
                                                            }`}>
                                                            {item._horas}h
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                        {item.notes || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                    <tfoot className="bg-indigo-50">
                                        <tr>
                                            <td colSpan="3" className="px-6 py-3 text-sm font-bold text-indigo-900 text-right">TOTAL HORAS</td>
                                            <td className="px-6 py-3">
                                                <span className="bg-indigo-600 text-white text-sm font-extrabold px-3 py-1.5 rounded-lg">
                                                    {totalConsumedHours}h
                                                </span>
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Tab: Bonos ── */}
                {activeTab === 'bonos' && (
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
                                            <span className="text-gray-600">Horas usadas:</span>
                                            <span className="font-bold text-orange-600">{bono.hoursUsed || 0}h</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Horas restantes:</span>
                                            <span className="font-bold text-green-600">{bono.hoursRemaining ?? bono.hours}h</span>
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
                )}

                {/* ── Tab: Historial Bonos ── */}
                {activeTab === 'interventions' && (
                    <div className="space-y-4">
                        {/* Totalizador */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-5 text-white shadow-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">🔧</span>
                                <div>
                                    <p className="text-sm font-semibold opacity-90">Total horas consumidas de bonos</p>
                                    <p className="text-xs opacity-75 mt-0.5">{interventions.length} intervención{interventions.length !== 1 ? 'es' : ''} registrada{interventions.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <p className="text-4xl font-extrabold">{bonoUsedHours}h</p>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                            {interventions.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-2xl text-gray-400 mb-2">🔧</p>
                                    <p className="text-xl text-gray-600">No hay intervenciones registradas</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-blue-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">Fecha</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">Horario</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">Horas</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">Notas</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">Evidencias</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {interventions.map((intervention) => (
                                            <tr key={intervention.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(intervention.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {intervention.startTime && intervention.endTime ? `${intervention.startTime} - ${intervention.endTime}` : (intervention.startTime || intervention.endTime || '-')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="bg-blue-100 text-blue-800 text-sm font-bold px-2.5 py-1 rounded">
                                                        {parseFloat(intervention.hoursUsed) || 0}h
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <div className="max-w-xs overflow-hidden text-ellipsis">{intervention.notes || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {intervention.images && intervention.images.length > 0 ? (
                                                        <div className="flex gap-1 overflow-x-auto max-w-[150px] pb-1">
                                                            {intervention.images.map((img, idx) => (
                                                                <img key={idx} src={img} alt="Evidencia" className="h-10 w-10 object-cover rounded cursor-pointer hover:opacity-80" onClick={() => window.open(img, '_blank')} />
                                                            ))}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-blue-50">
                                        <tr>
                                            <td colSpan="2" className="px-6 py-3 text-sm font-bold text-blue-900 text-right">TOTAL</td>
                                            <td className="px-6 py-3">
                                                <span className="bg-blue-700 text-white text-sm font-extrabold px-3 py-1 rounded">{bonoUsedHours}h</span>
                                            </td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Tab: Asistencias Puntuales ── */}
                {activeTab === 'punctual' && (
                    <div className="space-y-4">
                        {/* Totalizador */}
                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg p-5 text-white shadow-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">⚡</span>
                                <div>
                                    <p className="text-sm font-semibold opacity-90">Total horas en asistencias puntuales</p>
                                    <p className="text-xs opacity-75 mt-0.5">{punctualInterventions.length} asistencia{punctualInterventions.length !== 1 ? 's' : ''} registrada{punctualInterventions.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <p className="text-4xl font-extrabold">{totalPunctualHours}h</p>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                            {punctualInterventions.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-2xl text-gray-400 mb-2">⚡</p>
                                    <p className="text-xl text-gray-600">No hay asistencias puntuales registradas</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-orange-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 uppercase">Fecha</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 uppercase">Horario</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 uppercase">Horas</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 uppercase">Notas</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 uppercase">Evidencias</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {punctualInterventions.map((intervention) => (
                                            <tr key={intervention.id} className="hover:bg-orange-50/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(intervention.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {intervention.startTime && intervention.endTime ? `${intervention.startTime} - ${intervention.endTime}` : (intervention.startTime || intervention.endTime || '-')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="bg-orange-100 text-orange-800 text-sm font-bold px-2.5 py-1 rounded">
                                                        {parseFloat(intervention.hours) || 0}h
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <div className="max-w-xs overflow-hidden text-ellipsis">{intervention.notes || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {intervention.images && intervention.images.length > 0 ? (
                                                        <div className="flex gap-1 overflow-x-auto max-w-[150px] pb-1">
                                                            {intervention.images.map((img, idx) => (
                                                                <img key={idx} src={img} alt="Evidencia" className="h-10 w-10 object-cover rounded cursor-pointer hover:opacity-80" onClick={() => window.open(img, '_blank')} />
                                                            ))}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-orange-50">
                                        <tr>
                                            <td colSpan="2" className="px-6 py-3 text-sm font-bold text-orange-900 text-right">TOTAL</td>
                                            <td className="px-6 py-3">
                                                <span className="bg-orange-600 text-white text-sm font-extrabold px-3 py-1 rounded">{totalPunctualHours}h</span>
                                            </td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
