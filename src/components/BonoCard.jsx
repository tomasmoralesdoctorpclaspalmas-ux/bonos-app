import { motion } from 'framer-motion';

export default function BonoCard({ bono, onEdit, onDelete, onViewHistory }) {
    const statusColors = {
        active: 'bg-green-100 text-green-800 border-green-300',
        depleted: 'bg-orange-100 text-orange-800 border-orange-300',
        expired: 'bg-red-100 text-red-800 border-red-300'
    };

    const statusLabels = {
        active: 'Activo',
        depleted: 'Agotado',
        expired: 'Expirado'
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Sin expiración';
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-blue-500"
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {bono.clientName}
                        {onViewHistory && (
                            <button
                                onClick={() => onViewHistory(bono)}
                                className="text-gray-400 hover:text-blue-600 transition-colors text-sm border border-gray-200 rounded px-2 py-0.5 bg-gray-50"
                                title="Ver historial de asistencias"
                            >
                                👁️ Ver
                            </button>
                        )}
                    </h3>
                    <p className="text-gray-600">{bono.service}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColors[bono.status]}`}>
                    {statusLabels[bono.status]}
                </span>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                    <span className="text-gray-600">Horas totales:</span>
                    <span className="font-bold text-lg text-blue-600">{bono.hours}h</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Horas usadas:</span>
                    <span className="font-semibold text-gray-800">{bono.hoursUsed || 0}h</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Horas restantes:</span>
                    <span className="font-bold text-lg text-green-600">{bono.hoursRemaining || bono.hours}h</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Emisión:</span>
                    <span className="text-gray-800">{formatDate(bono.issueDate)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Expiración:</span>
                    <span className="text-gray-800">
                        {bono.neverExpires ? '♾️ Nunca expira' : formatDate(bono.expiryDate)}
                    </span>
                </div>
            </div>

            {bono.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-sm text-gray-700">{bono.notes}</p>
                </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                    onClick={() => onEdit(bono)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors"
                >
                    ✏️ Editar
                </button>
                <button
                    onClick={() => onDelete(bono.id)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition-colors"
                >
                    🗑️ Eliminar
                </button>
            </div>
        </motion.div>
    );
}
