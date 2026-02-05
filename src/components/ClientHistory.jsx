import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getInterventionsByClient, deleteIntervention, updateIntervention } from '../db';

export default function ClientHistory({ client, onClose }) {
    const [interventions, setInterventions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editNotes, setEditNotes] = useState('');

    useEffect(() => {
        if (client) {
            loadHistory();
        }
    }, [client]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await getInterventionsByClient(client.uid);
            setInterventions(data);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // For cases where it's just YYYY-MM-DD
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleEdit = (intervention) => {
        setEditingId(intervention.id);
        setEditNotes(intervention.notes || '');
    };

    const handleSaveEdit = async (intervention) => {
        try {
            await updateIntervention(intervention.id, {
                ...intervention,
                notes: editNotes
            });
            setInterventions(prev => prev.map(i =>
                i.id === intervention.id ? { ...i, notes: editNotes } : i
            ));
            setEditingId(null);
        } catch (error) {
            console.error('Error updating intervention:', error);
            alert('Error al actualizar la asistencia');
        }
    };

    const handleDelete = async (intervention) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta asistencia?\n\nEsta acción restaurará las horas al bono.')) {
            return;
        }

        if (!confirm('⚠️ CONFIRMACIÓN FINAL\n\n¿Realmente deseas eliminar esta asistencia? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await deleteIntervention(intervention.id, intervention);
            setInterventions(prev => prev.filter(i => i.id !== intervention.id));
        } catch (error) {
            console.error('Error deleting intervention:', error);
            alert('Error al eliminar la asistencia');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="bg-purple-600 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">📜 Historial de Asistencias</h2>
                        <p className="text-purple-100 text-sm">Cliente: {client.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-purple-700 p-2 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-purple-600"></div>
                        </div>
                    ) : interventions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-4xl mb-3">📭</p>
                            <p>No hay asistencias registradas para este cliente.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {interventions.map((intervention) => (
                                <motion.div
                                    key={intervention.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                                >
                                    <div className="flex justify-between items-start flex-wrap gap-4 mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                                🗓️ {formatDate(intervention.date)}
                                            </span>
                                            {(intervention.startTime || intervention.endTime) && (
                                                <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                                    🕒 {intervention.startTime && intervention.endTime ? `${intervention.startTime} - ${intervention.endTime}` : (intervention.startTime || intervention.endTime)}
                                                </span>
                                            )}
                                            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                                ⏱️ -{intervention.hoursUsed}h
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            {editingId === intervention.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleSaveEdit(intervention)}
                                                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                                                    >
                                                        ✓ Guardar
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                                                    >
                                                        ✕ Cancelar
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(intervention)}
                                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(intervention)}
                                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                    >
                                                        🗑️ Borrar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {editingId === intervention.id ? (
                                        <textarea
                                            value={editNotes}
                                            onChange={(e) => setEditNotes(e.target.value)}
                                            className="w-full text-gray-700 bg-white border border-blue-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                            rows="3"
                                            placeholder="Notas / Observaciones..."
                                        />
                                    ) : (
                                        intervention.notes && (
                                            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                                                {intervention.notes}
                                            </p>
                                        )
                                    )}

                                    {/* Image Gallery */}
                                    {intervention.images && intervention.images.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Evidencias</h4>
                                            <div className="flex gap-2 overflow-x-auto pb-2">
                                                {intervention.images.map((imgUrl, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={imgUrl}
                                                        alt={`Evidence ${idx}`}
                                                        className="h-24 w-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-gray-200"
                                                        onClick={() => setSelectedImage(imgUrl)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-white border-t border-gray-200 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-medium"
                    >
                        Cerrar
                    </button>
                </div>
            </motion.div>

            {/* Lightbox for Images */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedImage(null)}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 p-4"
                    >
                        <img
                            src={selectedImage}
                            alt="Full size"
                            className="max-w-full max-h-[90vh] rounded shadow-2xl"
                        />
                        <button
                            className="absolute top-4 right-4 text-white hover:text-gray-300"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
