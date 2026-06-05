import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ResumenHoras({ users = [], empresas = [], interventions = [], punctualInterventions = [] }) {
    const [groupBy, setGroupBy] = useState('empresa'); // 'empresa' | 'cliente'
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [checkedInterventions, setCheckedInterventions] = useState({});

    // Processing data
    const getCompanySummary = () => {
        return empresas.map(emp => {
            const companyUsers = users.filter(u => u.empresaId === emp.id);
            const userIds = companyUsers.map(u => u.uid);

            const companyInterventions = interventions.filter(i => {
                if (!i.clientName) return i.clientId === emp.id || userIds.includes(i.clientId);
                const clientNameClean = i.clientName.toLowerCase().trim();
                const empNameClean = emp.name.toLowerCase().trim();
                return (
                    i.clientId === emp.id ||
                    userIds.includes(i.clientId) ||
                    clientNameClean === empNameClean ||
                    (clientNameClean.length >= 4 && empNameClean.includes(clientNameClean))
                );
            });
            const companyPunctuals = punctualInterventions.filter(p => {
                if (!p.clientName) return p.clientId === emp.id || userIds.includes(p.clientId);
                const clientNameClean = p.clientName.toLowerCase().trim();
                const empNameClean = emp.name.toLowerCase().trim();
                return (
                    p.clientId === emp.id ||
                    userIds.includes(p.clientId) ||
                    clientNameClean === empNameClean ||
                    (clientNameClean.length >= 4 && empNameClean.includes(clientNameClean))
                );
            });

            const allInterventions = [
                ...companyInterventions.map(i => ({ ...i, type: 'bono', hours: i.hoursUsed })),
                ...companyPunctuals.map(p => ({ ...p, type: 'puntual', hours: p.hours }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            const totalHours = allInterventions.reduce((sum, item) => sum + item.hours, 0);

            return {
                id: emp.id,
                name: emp.name,
                totalHours,
                interventions: allInterventions,
                clientsCount: companyUsers.length
            };
        }).sort((a, b) => b.totalHours - a.totalHours);
    };

    const getClientSummary = () => {
        return users.map(user => {
            const clientInterventions = interventions.filter(i => {
                if (!i.clientName) return i.clientId === user.uid;
                const clientNameClean = i.clientName.toLowerCase().trim();
                const userNameClean = user.name.toLowerCase().trim();
                return (
                    i.clientId === user.uid ||
                    clientNameClean === userNameClean ||
                    (clientNameClean.length >= 4 && userNameClean.includes(clientNameClean))
                );
            });
            const clientPunctuals = punctualInterventions.filter(p => {
                if (!p.clientName) return p.clientId === user.uid;
                const clientNameClean = p.clientName.toLowerCase().trim();
                const userNameClean = user.name.toLowerCase().trim();
                return (
                    p.clientId === user.uid ||
                    clientNameClean === userNameClean ||
                    (clientNameClean.length >= 4 && userNameClean.includes(clientNameClean))
                );
            });

            const allInterventions = [
                ...clientInterventions.map(i => ({ ...i, type: 'bono', hours: i.hoursUsed })),
                ...clientPunctuals.map(p => ({ ...p, type: 'puntual', hours: p.hours }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            const totalHours = allInterventions.reduce((sum, item) => sum + item.hours, 0);

            return {
                id: user.uid,
                name: user.name,
                companyName: user.companyName || 'Particular',
                totalHours,
                interventions: allInterventions
            };
        }).sort((a, b) => b.totalHours - a.totalHours);
    };

    const summaries = groupBy === 'empresa' ? getCompanySummary() : getClientSummary();

    const filteredSummaries = summaries.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.companyName && item.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const selectedItem = summaries.find(item => item.id === selectedItemId);

    // Initialize checkboxes for selected company/client when opened
    useEffect(() => {
        if (selectedItem) {
            const initialChecked = {};
            selectedItem.interventions.forEach(item => {
                initialChecked[item.id] = true; // checked by default
            });
            setCheckedInterventions(initialChecked);
        } else {
            setCheckedInterventions({});
        }
    }, [selectedItemId]);

    // Handle check toggle
    const handleCheckToggle = (id) => {
        setCheckedInterventions(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Toggle all
    const handleToggleAll = (checked) => {
        if (!selectedItem) return;
        const updated = {};
        selectedItem.interventions.forEach(item => {
            updated[item.id] = checked;
        });
        setCheckedInterventions(updated);
    };

    // Calculate sum of checked hours
    const getCheckedHours = () => {
        if (!selectedItem) return 0;
        return selectedItem.interventions
            .filter(item => checkedInterventions[item.id])
            .reduce((sum, item) => sum + item.hours, 0);
    };

    const totalSelectedHours = getCheckedHours();
    const allCheckedCount = selectedItem ? selectedItem.interventions.length : 0;
    const checkedCount = selectedItem ? selectedItem.interventions.filter(item => checkedInterventions[item.id]).length : 0;

    return (
        <div className="space-y-8">
            {/* Header controls */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100/80 flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Agrupación selector */}
                <div className="flex bg-gray-100 p-1.5 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => { setGroupBy('empresa'); setSelectedItemId(null); }}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${groupBy === 'empresa'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        🏢 Por Empresa
                    </button>
                    <button
                        onClick={() => { setGroupBy('cliente'); setSelectedItemId(null); }}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${groupBy === 'cliente'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        👥 Por Cliente
                    </button>
                </div>

                {/* Buscador */}
                <div className="relative w-full md:w-80">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        🔍
                    </span>
                    <input
                        type="text"
                        placeholder={groupBy === 'empresa' ? 'Buscar empresa...' : 'Buscar cliente...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-gray-800"
                    />
                </div>
            </div>

            {/* main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* List Summary */}
                <div className={`col-span-1 lg:col-span-6 space-y-4`}>
                    <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        <span>📊</span> Resumen de Horas de Asistencias
                    </h2>

                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-blue-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">
                                            {groupBy === 'empresa' ? 'Empresa' : 'Cliente'}
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-blue-900 uppercase tracking-wider">
                                            {groupBy === 'empresa' ? 'Clientes' : 'Empresa'}
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-blue-900 uppercase tracking-wider">
                                            Asistencias
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-blue-900 uppercase tracking-wider">
                                            Horas Totales
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150">
                                    {filteredSummaries.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-10 text-center text-gray-500 italic">
                                                No hay resultados que coincidan con la búsqueda.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSummaries.map((item) => (
                                            <tr
                                                key={item.id}
                                                onClick={() => setSelectedItemId(item.id)}
                                                className={`cursor-pointer transition-colors ${selectedItemId === item.id
                                                    ? 'bg-blue-50/80 hover:bg-blue-50'
                                                    : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                        <span>{groupBy === 'empresa' ? '🏢' : '👤'}</span>
                                                        {item.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                                                    {groupBy === 'empresa' ? (
                                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold">
                                                            {item.clientsCount} {item.clientsCount === 1 ? 'cliente' : 'clientes'}
                                                        </span>
                                                    ) : (
                                                        <span className="truncate max-w-[120px] inline-block">
                                                            {item.companyName}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                    <span className="bg-gray-100 text-gray-750 px-2.5 py-1 rounded-full text-xs font-bold">
                                                        {item.interventions.length} {item.interventions.length === 1 ? 'asist.' : 'asist.'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <span className="bg-blue-150 text-blue-800 font-extrabold px-3 py-1.5 rounded-lg text-xs">
                                                        {item.totalHours} hrs
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Details / Interactive Calculator */}
                <div className="col-span-1 lg:col-span-6 space-y-4">
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
                                    Haz clic en la lista de la izquierda para ver el desglose de asistencias, filtrar las cobradas y calcular totales.
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
                                {/* Header del detalle */}
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

                                {/* Calculadora interactiva flotante/fija */}
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

                                {/* Listado de asistencias */}
                                <div className="divide-y divide-gray-150 overflow-y-auto max-h-[400px]">
                                    {selectedItem.interventions.length === 0 ? (
                                        <div className="px-6 py-8 text-center text-gray-500 italic">
                                            No hay asistencias registradas para esta selección.
                                        </div>
                                    ) : (
                                        selectedItem.interventions.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleCheckToggle(item.id)}
                                                className={`px-6 py-4 flex items-start gap-4 cursor-pointer transition-colors ${checkedInterventions[item.id]
                                                    ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                                                    : 'bg-gray-50/30 hover:bg-gray-50/80 opacity-60'
                                                    }`}
                                            >
                                                {/* Checkbox */}
                                                <div className="pt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!checkedInterventions[item.id]}
                                                        onChange={() => { }} // Handled by outer div onClick
                                                        className="h-5.5 w-5.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                </div>

                                                {/* Información */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2 flex-wrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                {new Date(item.date).toLocaleDateString()}
                                                            </span>
                                                            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${item.type === 'bono'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-orange-100 text-orange-800'
                                                                }`}>
                                                                {item.type === 'bono' ? '🎫 Bono' : '⚡ Puntual'}
                                                            </span>
                                                        </div>
                                                        <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-1 rounded">
                                                            {item.hours} hrs
                                                        </span>
                                                    </div>

                                                    {/* Cliente si es vista agrupada por empresa */}
                                                    {groupBy === 'empresa' && (
                                                        <p className="text-xs text-blue-600 font-medium mt-1">
                                                            👤 Cliente: {item.clientName}
                                                        </p>
                                                    )}

                                                    {/* Horario si es puntual */}
                                                    {item.type === 'puntual' && (item.startTime || item.endTime) && (
                                                        <p className="text-xs text-purple-600 font-medium mt-1">
                                                            🕒 Horario: {item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : (item.startTime || item.endTime)}
                                                        </p>
                                                    )}

                                                    {/* Notas */}
                                                    {item.notes && (
                                                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg mt-2 italic border border-gray-100">
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
