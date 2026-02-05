import { motion } from 'framer-motion';

export default function Dashboard({ bonos }) {
    const stats = {
        total: bonos.length,
        active: bonos.filter(b => b.status === 'active').length,
        depleted: bonos.filter(b => b.status === 'depleted').length,
        expired: bonos.filter(b => b.status === 'expired').length,
        totalHours: bonos.reduce((sum, b) => sum + (b.hours || 0), 0),
        usedHours: bonos.reduce((sum, b) => sum + (b.hoursUsed || 0), 0),
        remainingHours: bonos.reduce((sum, b) => sum + (b.hoursRemaining || b.hours || 0), 0)
    };

    const cards = [
        { label: 'Total Bonos', value: stats.total, color: 'bg-blue-500', icon: '📊' },
        { label: 'Activos', value: stats.active, color: 'bg-green-500', icon: '✅' },
        { label: 'Agotados', value: stats.depleted, color: 'bg-orange-500', icon: '⚠️' },
        { label: 'Expirados', value: stats.expired, color: 'bg-red-500', icon: '⏰' },
        { label: 'Horas Totales', value: `${stats.totalHours}h`, color: 'bg-purple-500', icon: '⏱️' },
        { label: 'Horas Usadas', value: `${stats.usedHours}h`, color: 'bg-gray-500', icon: '✔️' },
        { label: 'Horas Restantes', value: `${stats.remainingHours}h`, color: 'bg-teal-500', icon: '💎' }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
            {cards.map((card, index) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`${card.color} text-white rounded-lg p-6 shadow-lg`}
                >
                    <div className="text-3xl mb-2">{card.icon}</div>
                    <div className="text-2xl font-bold mb-1">{card.value}</div>
                    <div className="text-sm opacity-90">{card.label}</div>
                </motion.div>
            ))}
        </div>
    );
}
