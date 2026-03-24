import { useState } from 'react';
import { motion } from 'framer-motion';

export default function InterventionEditModal({ intervention, onSave, onCancel }) {
    // intervention comes with ISO string or 'YYYY-MM-DD' for date
    const resolveDate = (date) => {
        if (!date) return new Date().toISOString().split('T')[0];
        try {
            return date.split('T')[0];
        } catch(e) {
            return new Date().toISOString().split('T')[0];
        }
    };

    const [formData, setFormData] = useState({
        date: resolveDate(intervention.date),
        startTime: intervention.startTime || '',
        endTime: intervention.endTime || '',
        hours: intervention.hours !== undefined ? intervention.hours : (intervention.hoursUsed || 0),
        notes: intervention.notes || ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const submitData = {
            date: formData.date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            notes: formData.notes
        };

        // If the intervention uses 'hoursUsed' (bono), pass that, else pass 'hours' (punctual)
        if (intervention.hoursUsed !== undefined || intervention.bonoId) {
            submitData.hoursUsed = parseFloat(formData.hours);
        } else {
            submitData.hours = parseFloat(formData.hours);
        }

        try {
            await onSave(submitData);
        } catch (error) {
            console.error(error);
            alert("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg"
            >
                <h3 className="text-xl font-bold mb-4 text-gray-800">✏️ Editar Asistencia</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Horas Dedicadas</label>
                            <input
                                type="number"
                                step="0.25"
                                min="0.25"
                                value={formData.hours}
                                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones / Notas</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 outline-none"
                            rows="3"
                        />
                    </div>

                    <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : '💾 Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
