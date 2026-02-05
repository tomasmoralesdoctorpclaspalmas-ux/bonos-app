import { useState, useEffect } from 'react';
import { getUsers } from '../db';
import { motion } from 'framer-motion';

export default function BonoForm({ bono, onSubmit, onCancel }) {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        clientId: '',
        clientName: '',
        service: '',
        hours: '',
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        neverExpires: false,
        status: 'active',
        notes: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const allUsers = await getUsers();
                // Filter out admins
                const clients = allUsers.filter(user => user.role !== 'admin');
                setUsers(clients);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        if (bono) {
            setFormData({
                clientId: bono.clientId || '',
                clientName: bono.clientName,
                service: bono.service,
                hours: bono.hours,
                issueDate: bono.issueDate.split('T')[0],
                expiryDate: bono.expiryDate ? bono.expiryDate.split('T')[0] : '',
                neverExpires: bono.neverExpires || false,
                status: bono.status,
                notes: bono.notes || ''
            });
        }
    }, [bono]);

    const validate = () => {
        const newErrors = {};

        if (!formData.clientName.trim()) {
            newErrors.clientName = 'El nombre del cliente es requerido';
        }

        if (!formData.service.trim()) {
            newErrors.service = 'El servicio es requerido';
        }

        if (!formData.hours || formData.hours <= 0) {
            newErrors.hours = 'Las horas deben ser mayor a 0';
        }

        if (!formData.neverExpires) {
            if (!formData.expiryDate) {
                newErrors.expiryDate = 'La fecha de expiración es requerida';
            } else if (new Date(formData.expiryDate) <= new Date(formData.issueDate)) {
                newErrors.expiryDate = 'La fecha de expiración debe ser posterior a la fecha de emisión';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validate()) {
            const submitData = {
                ...formData,
                hours: parseFloat(formData.hours),
                hoursUsed: bono?.hoursUsed || 0,
                hoursRemaining: bono ? (parseFloat(formData.hours) - (bono.hoursUsed || 0)) : parseFloat(formData.hours),
                issueDate: new Date(formData.issueDate).toISOString(),
                expiryDate: formData.neverExpires ? null : new Date(formData.expiryDate).toISOString(),
                neverExpires: formData.neverExpires
            };

            onSubmit(submitData);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        setFormData(prev => ({ ...prev, [name]: newValue }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-lg p-6 mb-6"
        >
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
                {bono ? 'Editar Bono' : 'Nuevo Bono'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cliente *
                        </label>
                        <select
                            name="clientId"
                            value={formData.clientId}
                            onChange={(e) => {
                                const selectedUser = users.find(u => u.uid === e.target.value);
                                setFormData(prev => ({
                                    ...prev,
                                    clientId: e.target.value,
                                    clientName: selectedUser ? selectedUser.name : ''
                                }));
                                if (errors.clientName) {
                                    setErrors(prev => ({ ...prev, clientName: '' }));
                                }
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.clientName ? 'border-red-500' : 'border-gray-300'
                                }`}
                        >
                            <option value="">Seleccionar cliente...</option>
                            {users.map(user => (
                                <option key={user.uid} value={user.uid}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                        {errors.clientName && (
                            <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Servicio *
                        </label>
                        <input
                            type="text"
                            name="service"
                            value={formData.service}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.service ? 'border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="Ej: Reparación de PC"
                        />
                        {errors.service && (
                            <p className="text-red-500 text-xs mt-1">{errors.service}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Horas *
                        </label>
                        <input
                            type="number"
                            name="hours"
                            value={formData.hours}
                            onChange={handleChange}
                            min="0"
                            step="0.5"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.hours ? 'border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="0.0"
                        />
                        {errors.hours && (
                            <p className="text-red-500 text-xs mt-1">{errors.hours}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estado
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="active">Activo</option>
                            <option value="depleted">Agotado</option>
                            <option value="expired">Expirado</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Emisión *
                        </label>
                        <input
                            type="date"
                            name="issueDate"
                            value={formData.issueDate}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Expiración {!formData.neverExpires && '*'}
                        </label>
                        <input
                            type="date"
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleChange}
                            disabled={formData.neverExpires}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formData.neverExpires ? 'bg-gray-100 cursor-not-allowed' : ''
                                } ${errors.expiryDate ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        {errors.expiryDate && (
                            <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>
                        )}

                        <div className="mt-2">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="neverExpires"
                                    checked={formData.neverExpires}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Nunca expira</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Información adicional sobre el bono..."
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        {bono ? 'Actualizar Bono' : 'Crear Bono'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </motion.div>
    );
}
