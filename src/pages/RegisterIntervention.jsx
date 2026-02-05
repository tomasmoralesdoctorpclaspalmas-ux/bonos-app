import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getUsers, getBonosByClient, addIntervention } from '../db';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function RegisterIntervention() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [bonos, setBonos] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedBono, setSelectedBono] = useState('');
    const [hours, setHours] = useState('');
    const [notes, setNotes] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        if (selectedClient) {
            loadBonos(selectedClient);
        } else {
            setBonos([]);
            setSelectedBono('');
        }
    }, [selectedClient]);

    const loadClients = async () => {
        try {
            const allUsers = await getUsers();
            setClients(allUsers.filter(u => u.role !== 'admin'));
        } catch (err) {
            console.error('Error loading clients:', err);
            setError('Error al cargar clientes');
        }
    };

    const loadBonos = async (clientId) => {
        try {
            const clientBonos = await getBonosByClient(clientId);
            // Only show active bonos with hours remaining
            const activeBonos = clientBonos.filter(b => b.status === 'active' && b.hoursRemaining > 0);
            setBonos(activeBonos);
        } catch (err) {
            console.error('Error loading bonos:', err);
            setError('Error al cargar bonos del cliente');
        }
    };

    const handleImageChange = (e) => {
        if (e.target.files) {
            setImages(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!selectedBono || !hours || parseFloat(hours) <= 0) {
            setError('Por favor selecciona un bono y horas válidas');
            setLoading(false);
            return;
        }

        const bono = bonos.find(b => b.id === selectedBono);
        if (parseFloat(hours) > bono.hoursRemaining) {
            setError(`No puedes registrar más horas de las disponibles (${bono.hoursRemaining}h)`);
            setLoading(false);
            return;
        }

        try {
            // Upload images
            const imageUrls = [];
            if (images.length > 0) {
                console.log('Starting image uploads...', images.length, 'images');
                for (const image of images) {
                    try {
                        const path = `interventions/${selectedClient}/${Date.now()}_${image.name}`;
                        console.log('Uploading to path:', path);
                        const storageRef = ref(storage, path);
                        await uploadBytes(storageRef, image);
                        const url = await getDownloadURL(storageRef);
                        imageUrls.push(url);
                    } catch (uploadErr) {
                        console.error('Individual image upload failed:', uploadErr);
                        throw new Error(`Error al subir la imagen ${image.name}: ${uploadErr.message}`);
                    }
                }
            }

            // Create intervention
            console.log('Saving intervention data to Firestore...');
            await addIntervention({
                clientId: selectedClient,
                bonoId: selectedBono,
                hoursUsed: parseFloat(hours),
                date: new Date().toISOString(),
                notes,
                images: imageUrls,
                clientName: clients.find(c => c.uid === selectedClient)?.name
            });

            navigate('/admin');
        } catch (err) {
            console.error('Error registering intervention:', err);
            setError(err.message || 'Error al registrar la asistencia. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-2xl overflow-hidden"
                >
                    <div className="bg-blue-600 px-6 py-4">
                        <h2 className="text-2xl font-bold text-white">📋 Registrar Asistencia</h2>
                        <p className="text-blue-100">Registra horas y evidencias del trabajo realizado</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                <p className="text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cliente *
                                </label>
                                <select
                                    value={selectedClient}
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Seleccionar Cliente...</option>
                                    {clients.map(client => (
                                        <option key={client.uid} value={client.uid}>
                                            {client.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bono a Descontar *
                                </label>
                                <select
                                    value={selectedBono}
                                    onChange={(e) => setSelectedBono(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={!selectedClient}
                                    required
                                >
                                    <option value="">Seleccionar Bono...</option>
                                    {bonos.map(bono => (
                                        <option key={bono.id} value={bono.id}>
                                            {bono.service} ({bono.hoursRemaining}h restantes)
                                        </option>
                                    ))}
                                </select>
                                {selectedClient && bonos.length === 0 && (
                                    <p className="text-xs text-orange-500 mt-1">Este cliente no tiene bonos activos.</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Horas Dedicadas *
                            </label>
                            <input
                                type="number"
                                value={hours}
                                onChange={(e) => setHours(e.target.value)}
                                min="0.5"
                                step="0.5"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ej: 1.5"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notas / Observaciones
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows="3"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Describe el trabajo realizado..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Evidencias (Imágenes)
                            </label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                        </svg>
                                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
                                        <p className="text-xs text-gray-500">PNG, JPG (MAX. 5MB)</p>
                                    </div>
                                    <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageChange} />
                                </label>
                            </div>

                            {/* Image Preview */}
                            {images.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {images.map((img, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={URL.createObjectURL(img)}
                                                alt={`Preview ${index}`}
                                                className="h-20 w-full object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => navigate('/admin')}
                                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg ${loading ? 'opacity-70 cursor-not-allowed' : ''
                                    }`}
                            >
                                {loading ? 'Guardando...' : '💾 Registrar Asistencia'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
