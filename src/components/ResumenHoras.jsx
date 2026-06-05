import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── helpers ────────────────────────────────────────────────────────────────

const toNum = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
};

const normalize = (s) => (s || '').toLowerCase().trim();

/**
 * Returns true when two name strings are "close enough" to be the same entity.
 * We require at least 4 chars to avoid false positives on short words.
 */
const nameMatch = (a, b) => {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.length >= 4 && nb.includes(na)) return true;
    if (nb.length >= 4 && na.includes(nb)) return true;
    return false;
};

// ─── main component ─────────────────────────────────────────────────────────

export default function ResumenHoras({
    users = [],
    empresas = [],
    interventions = [],        // bono-based (clientId = empresa ID)
    punctualInterventions = [] // direct (clientId = empresa ID or user UID, or empty)
}) {
    const [groupBy, setGroupBy] = useState('empresa'); // 'empresa' | 'cliente'
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [checkedInterventions, setCheckedInterventions] = useState({});

    // ── matching helpers ────────────────────────────────────────────────────

    /**
     * Does this intervention/punctual record belong to a given empresa?
     *
     * Priority:
     *  1. clientId matches empresa ID directly
     *  2. clientId matches one of the empresa's users' UIDs
     *  3. clientName matches empresa name (fuzzy)
     *  4. clientName matches one of the empresa's users' names (fuzzy)
     */
    const belongsToEmpresa = (item, emp, companyUsers) => {
        // 1. Direct match by empresa ID
        if (item.clientId && item.clientId === emp.id) return true;

        // 2. Match via one of empresa's users
        if (item.clientId && companyUsers.some(u => u.uid === item.clientId)) return true;

        // 3. Name-based fallback
        const clientName = item.clientName || '';
        if (nameMatch(clientName, emp.name)) return true;

        // 4. Match name against empresa users
        if (companyUsers.some(u => nameMatch(clientName, u.name))) return true;

        return false;
    };

    /**
     * Does this record belong to a given user (individual client)?
     */
    const belongsToUser = (item, user) => {
        if (item.clientId && item.clientId === user.uid) return true;
        const clientName = item.clientName || '';
        if (nameMatch(clientName, user.name)) return true;
        return false;
    };

    // ── summary builders ────────────────────────────────────────────────────

    const getCompanySummary = () => {
        return empresas.map(emp => {
            const companyUsers = users.filter(u => u.empresaId === emp.id);

            const companyInterventions = interventions.filter(i =>
                belongsToEmpresa(i, emp, companyUsers)
            );
            const companyPunctuals = punctualInterventions.filter(p =>
                belongsToEmpresa(p, emp, companyUsers)
            );

            const allItems = [
                ...companyInterventions.map(i => ({
                    ...i,
                    type: 'bono',
                    hours: toNum(i.hoursUsed)
                })),
                ...companyPunctuals.map(p => ({
                    ...p,
                    type: 'puntual',
                    hours: toNum(p.hours)
                }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            const totalHours = allItems.reduce((sum, item) => sum + item.hours, 0);

            return {
                id: emp.id,
                name: emp.name,
                totalHours,
                interventions: allItems,
                clientsCount: companyUsers.length
            };
        }).sort((a, b) => b.totalHours - a.totalHours);
    };

    const getClientSummary = () => {
        return users.map(user => {
            const clientInterventions = interventions.filter(i =>
                belongsToUser(i, user)
            );
            const clientPunctuals = punctualInterventions.filter(p =>
                belongsToUser(p, user)
            );

            const allItems = [
                ...clientInterventions.map(i => ({
                    ...i,
                    type: 'bono',
                    hours: toNum(i.hoursUsed)
                })),
                ...clientPunctuals.map(p => ({
                    ...p,
                    type: 'puntual',
                    hours: toNum(p.hours)
                }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            const totalHours = allItems.reduce((sum, item) => sum + item.hours, 0);

            const empresa = empresas.find(e => e.id === user.empresaId);

            return {
                id: user.uid,
                name: user.name,
                companyName: empresa?.name || user.companyName || 'Particular',
                totalHours,
                interventions: allItems
            };
        }).sort((a, b) => b.totalHours - a.totalHours);
    };

    const summaries = groupBy === 'empresa' ? getCompanySummary() : getClientSummary();

    const filteredSummaries = summaries.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.companyName && item.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const selectedItem = summaries.find(item => item.id === selectedItemId);

    // ── checkbox helpers ────────────────────────────────────────────────────

    useEffect(() => {
        if (selectedItem) {
            const initial = {};
            selectedItem.interventions.forEach(item => { initial[item.id] = true; });
            setCheckedInterventions(initial);
        } else {
            setCheckedInterventions({});
        }
    }, [selectedItemId]);

    const handleCheckToggle = (id) => {
        setCheckedInterventions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleToggleAll = (checked) => {
        if (!selectedItem) return;
        const updated = {};
        selectedItem.interventions.forEach(item => { updated[item.id] = checked; });
        setCheckedInterventions(updated);
    };

    const getCheckedHours = () => {
        if (!selectedItem) return 0;
        return selectedItem.interventions
            .filter(item => checkedInterventions[item.id])
            .reduce((sum, item) => sum + item.hours, 0);
    };

    const totalSelectedHours = getCheckedHours();
    const allCheckedCount = selectedItem ? selectedItem.interventions.length : 0;
    const checkedCount = selectedItem
        ? selectedItem.interventions.filter(item => checkedInterventions[item.id]).length
        : 0;

    // ── render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-8">
            {/* Header controls */}
            <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100/80 flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Agrupación selector */}
                <div className="flex bg-gray-100 p-1.5 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => { setGroupBy('empresa'); setSelectedItemId(null); }}
                        className={`flex-1 md:flex-none px-5 py-2 rounded-lg font-bold text-sm transition-all ${groupBy === 'empresa'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        🏢 Por Empresa
                    </button>
                    <button
                        onClick={() => { setGroupBy('cliente'); setSelectedItemId(null); }}
                        className={`flex-1 md:flex-none px-5 py-2 rounded-lg font-bold text-sm transition-all ${groupBy === 'cliente'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        👥 Por Cliente
                    </button>
                </div>

                {/* Buscador */}
                <div className="relative w-full md:w-72">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔍</span>
                    <input
                        type="text"
                        placeholder={groupBy === 'empresa' ? 'Buscar empresa...' : 'Buscar cliente...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-gray-800"
                    />
                </div>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── Summary Table ─────────────────────────────────────── */}
                <div className="col-span-1 lg:col-span-5 space-y-3">
                    <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        <span>📊</span> Resumen de Horas de Asistencias
                    </h2>

                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-blue-50/70">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wide w-1/2">
                                        {groupBy === 'empresa' ? 'Empresa' : 'Cliente'}
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-bold text-blue-900 uppercase tracking-wide w-1/6">
                                        {groupBy === 'empresa' ? 'Clientes' : 'Empresa'}
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-bold text-blue-900 uppercase tracking-wide w-1/6">
                                        Asist.
                                    </th>
                                    <th className="px-3 py-3 text-right text-xs font-bold text-blue-900 uppercase tracking-wide w-1/6">
                                        Horas
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSummaries.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-10 text-center text-gray-500 italic text-sm">
                                            No hay resultados que coincidan.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSummaries.map((item) => (
                                        <tr
                                            key={item.id}
                                            onClick={() => setSelectedItemId(item.id)}
                                            className={`cursor-pointer transition-colors ${selectedItemId === item.id
                                                ? 'bg-blue-50/80'
                                                : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 truncate max-w-[180px]">
                                                    <span className="shrink-0">{groupBy === 'empresa' ? '🏢' : '👤'}</span>
                                                    <span className="truncate">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {groupBy === 'empresa' ? (
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold text-gray-600">
                                                        {item.clientsCount}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-500 truncate max-w-[90px] inline-block">
                                                        {item.companyName}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                                    {item.interventions.length}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <span className="bg-blue-100 text-blue-800 font-extrabold px-2.5 py-1 rounded-lg text-xs">
                                                    {item.totalHours}h
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Detail / Calculator ───────────────────────────────── */}
                <div className="col-span-1 lg:col-span-7 space-y-3">
                    <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        <span>⏱️</span> Desglose y Conteo de Horas
                    </h2>

                    <AnimatePresence mode="wait">
                        {!selectedItem ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-500 flex flex-col items-center justify-center min-h-[300px]"
                            >
                                <span className="text-4xl mb-4">👈</span>
                                <p className="text-lg font-semibold text-gray-700">Selecciona una empresa o cliente</p>
                                <p className="text-sm text-gray-400 mt-1 max-w-xs">
                                    Haz clic en la lista de la izquierda para ver el desglose de asistencias y calcular totales.
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={selectedItemId}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col"
                            >
                                {/* Detail header */}
                                <div className="bg-blue-600 px-6 py-5 text-white flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-semibold text-blue-100 uppercase tracking-widest">Desglose de asistencias</p>
                                        <h3 className="text-xl font-bold mt-1 flex items-center gap-2">
                                            <span>{groupBy === 'empresa' ? '🏢' : '👤'}</span> {selectedItem.name}
                                        </h3>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs bg-blue-500/50 px-2 py-1 rounded font-medium">
                                            {selectedItem.interventions.length} asistencias
                                        </span>
                                    </div>
                                </div>

                                {/* Interactive calculator */}
                                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                                    <div>
                                        <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider">Calculadora automática</p>
                                        <div className="flex items-baseline gap-1 mt-0.5">
                                            <span className="text-3xl font-extrabold text-teal-700">{totalSelectedHours}</span>
                                            <span className="text-sm font-semibold text-teal-600">hrs seleccionadas</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            ({checkedCount} de {allCheckedCount} registradas)
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleToggleAll(true)}
                                            className="px-3 py-1.5 bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-bold rounded-lg transition-colors shadow-sm"
                                        >
                                            ✅ Seleccionar todo
                                        </button>
                                        <button
                                            onClick={() => handleToggleAll(false)}
                                            className="px-3 py-1.5 bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-bold rounded-lg transition-colors shadow-sm"
                                        >
                                            ❌ Desmarcar todo
                                        </button>
                                    </div>
                                </div>

                                {/* Intervention list */}
                                <div className="divide-y divide-gray-100 overflow-y-auto max-h-[430px]">
                                    {selectedItem.interventions.length === 0 ? (
                                        <div className="px-6 py-8 text-center text-gray-500 italic">
                                            No hay asistencias registradas para esta selección.
                                        </div>
                                    ) : (
                                        selectedItem.interventions.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleCheckToggle(item.id)}
                                                className={`px-5 py-3.5 flex items-start gap-4 cursor-pointer transition-colors ${checkedInterventions[item.id]
                                                    ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                                                    : 'bg-gray-50/30 hover:bg-gray-50/80 opacity-60'
                                                    }`}
                                            >
                                                {/* Checkbox */}
                                                <div className="pt-0.5 shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!checkedInterventions[item.id]}
                                                        onChange={() => { }}
                                                        className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2 flex-wrap">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                {new Date(item.date).toLocaleDateString('es-ES')}
                                                            </span>
                                                            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${item.type === 'bono'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-orange-100 text-orange-800'
                                                                }`}>
                                                                {item.type === 'bono' ? '🎫 Bono' : '⚡ Puntual'}
                                                            </span>
                                                        </div>
                                                        <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-1 rounded shrink-0">
                                                            {item.hours}h
                                                        </span>
                                                    </div>

                                                    {/* Client name (company view) */}
                                                    {groupBy === 'empresa' && item.clientName && (
                                                        <p className="text-xs text-blue-600 font-medium mt-1">
                                                            👤 {item.clientName}
                                                        </p>
                                                    )}

                                                    {/* Schedule for punctuals */}
                                                    {item.type === 'puntual' && (item.startTime || item.endTime) && (
                                                        <p className="text-xs text-purple-600 font-medium mt-1">
                                                            🕒 {item.startTime && item.endTime
                                                                ? `${item.startTime} – ${item.endTime}`
                                                                : (item.startTime || item.endTime)}
                                                        </p>
                                                    )}

                                                    {/* Notes */}
                                                    {item.notes && (
                                                        <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg mt-1.5 italic border border-gray-100 line-clamp-2">
                                                            {item.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
