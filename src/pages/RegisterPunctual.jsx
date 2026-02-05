import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { addPunctualIntervention } from '../db';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function RegisterPunctual() {
    const navigate = useNavigate();
    const [clientName, setClientName] = useState('');
    const [hours, setHours] = useState('');
    const [notes, setNotes] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

        if (!clientName || !hours || parseFloat(hours) <= 0) {
            setError('Por favor rellena el nombre y las horas');
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
                        const path = `punctual_interventions/${Date.now()}_${image.name}`;
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

            // Create punctual intervention
            await addPunctualIntervention({
                clientName,
                hours: parseFloat(hours),
                date: new Date().toISOString(),
                notes,
                images: imageUrls
            });

            navigate('/admin');
        } catch (err) {
            console.error('Error registering punctual intervention:', err);
            setError(err.message || 'Error al registrar la asistencia. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl shadow-2xl overflow-hidden"
                >
                    <div className="bg-orange-600 px-6 py-4">
                        <h2 className="text-2xl font-bold text-white">⚡ Asistencia Puntual</h2>
                        <p className="text-orange-100">Registra trabajos rápidos sin usuario registrado</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700">
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre del Cliente / Firma *
                                </label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="Ej: Empresa Externa S.A."
                                    required
                                />
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="Ej: 1"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notas / Observaciones
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows="3"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
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
                                        <p className="mb-2 text-sm text-gray-500">Haz clic para subir imágenes</p>
                                    </div>
                                    <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageChange} />
                                </label>
                            </div>

                            {images.length > 0 && (
                                <div className="mt-4 grid grid-cols-3 gap-4">
                                    {images.map((img, index) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={URL.createObjectURL(img)}
                                                alt="preview"
                                                className="h-20 w-full object-cover rounded-lg shadow-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 pt-4">
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
                                className={`flex-1 px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors shadow-lg ${loading ? 'opacity-50' : ''}`}
                            >
                                {loading ? 'Enviando...' : '🚀 Guardar Asistencia'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
