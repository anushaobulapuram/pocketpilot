import { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';

const Navbar = () => {
    const { user, token, logout } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);
    const [performance, setPerformance] = useState({ status: 'gray', tooltip: 'Loading...' });

    useEffect(() => {
        if (!token) return;

        const fetchPerformance = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/finance/daily-performance', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPerformance(res.data);
            } catch (err) {
                console.error("Failed to fetch daily performance", err);
            }
        };

        fetchPerformance();

        const handleUpdate = () => fetchPerformance();
        window.addEventListener('transaction-updated', handleUpdate);

        return () => window.removeEventListener('transaction-updated', handleUpdate);
    }, [token]);

    if (!user) return null;

    // Determine the indicator's Tailwind background color class
    let indicatorColor = 'bg-gray-400';
    if (performance.status === 'dark_green') indicatorColor = 'bg-green-700 shadow-[0_0_10px_rgba(21,128,61,0.6)]';
    else if (performance.status === 'light_green') indicatorColor = 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]';
    else if (performance.status === 'red') indicatorColor = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';

    return (
        <header className="w-full h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-end items-center px-8 sticky top-0 z-40 transition-colors">
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('calendar_history')}</span>
                {/* Daily Savings Performance Indicator */}
                <div
                    className={`w-4 h-4 rounded-sm transition-all duration-500 ${indicatorColor}`}
                    title={performance.tooltip}
                />
            </div>
        </header>
    );
};

export default Navbar;
