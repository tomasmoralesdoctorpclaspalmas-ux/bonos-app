import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loginUser } from '../auth';
import { initializeDefaultAdmin } from '../initAdmin';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [recoveryMsg, setRecoveryMsg] = useState('');
    const navigate = useNavigate();

    const handleCreateAdmin = async () => {
        if (!confirm('¿Intentar crear/restaurar el usuario administrador por defecto?')) return;
        setLoading(true);
        try {
            await initializeDefaultAdmin();
            setRecoveryMsg('Admin recreado. Intenta iniciar sesión.');
            setTimeout(() => setRecoveryMsg(''), 5000);
        } catch (err) {
            console.error(err);
            setError('Falló la creación del admin: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userData = await loginUser(email, password);

            // Redirect based on role
            if (userData.role === 'admin') {
                navigate('/admin');
            } else if (userData.role === 'client') {
                navigate('/client');
            } else {
                setError('Rol de usuario no válido');
            }
        } catch (err) {
            console.error('Login error:', err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Email o contraseña incorrectos');
            } else if (err.code === 'auth/invalid-email') {
                setError('Email no válido');
            } else {
                // Mostrar el mensaje real (ej: "Usuario no encontrado en la base de datos")
                setError(err.message || 'Error al iniciar sesión. Intenta nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">🎫 Control de Bonos</h1>
                    <p className="text-gray-600">Inicia sesión para continuar</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6"
                    >
                        <p className="text-sm">⚠️ {error}</p>
                    </motion.div>
                )}

                {recoveryMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6"
                    >
                        <p className="text-sm">✅ {recoveryMsg}</p>
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="tu@email.com"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="••••••••"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Iniciando sesión...
                            </span>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
                    <p>Sistema de gestión de bonos por horas</p>
                    <button
                        onClick={handleCreateAdmin}
                        className="mt-4 text-xs text-blue-500 hover:underline"
                    >
                        ¿Problemas? Re-crear Admin
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
