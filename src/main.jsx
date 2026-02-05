import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initializeDefaultAdmin } from './initAdmin'
import { ErrorBoundary } from './components/ErrorBoundary'

// Inicializar admin por defecto cuando la app carga
// Solo se ejecuta una vez, si el admin ya existe no hace nada
initializeDefaultAdmin().catch(console.error);

ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
)
