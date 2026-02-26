import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { Sliders, Calendar } from 'lucide-react';

const Profile = () => {
    const { user, token } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/finance/daily-history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setHistory(data);
                }
            } catch (err) { }
        };
        fetchHistory();
    }, [token]);

    if (!user) return null;

    // Generate months for the current year, padded for 7-column layout (Sun-Sat)
    const generateYearMonths = () => {
        const year = new Date().getFullYear();
        const monthsData = [];
        for (let m = 0; m < 12; m++) {
            const daysInMonth = new Date(year, m + 1, 0).getDate();
            const startDayOfWeek = new Date(year, m, 1).getDay(); // 0=Sun

            const days = [];
            // Padding for alignment
            for (let i = 0; i < startDayOfWeek; i++) {
                days.push(null);
            }
            // Actual days
            for (let d = 1; d <= daysInMonth; d++) {
                days.push(new Date(year, m, d));
            }
            monthsData.push({
                name: new Date(year, m, 1).toLocaleString('default', { month: 'long' }),
                days: days
            });
        }
        return monthsData;
    };

    const months = generateYearMonths();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getStatusForDate = (date) => {
        if (date > today) return { color: 'gray', text: t('future_date') };

        // Find matching history by comparing date strings (YYYY-MM-DD)
        const dateStr = date.toISOString().split('T')[0];
        const record = history.find(h => h.date.split('T')[0] === dateStr);

        if (record) {
            const colors = {
                'dark_green': { class: 'bg-green-600', text: t('saved_double') },
                'light_green': { class: 'bg-green-400', text: t('met_daily_goal') },
                'red': { class: 'bg-red-500', text: t('did_not_meet') },
                'gray': { class: 'bg-gray-300 dark:bg-gray-700', text: t('no_activity') }
            };
            const mapping = colors[record.statusColor];
            return { color: mapping ? mapping.class : 'bg-gray-300 dark:bg-gray-700', text: mapping ? mapping.text : t('no_data') };
        }

        return { color: 'bg-gray-300 dark:bg-gray-700', text: t('no_activity') };
    };

    return (
        <div className="max-w-4xl mx-auto py-8 animate-fade-in space-y-8">
            {/* Identity Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center relative overflow-hidden">
                <div className="w-28 h-28 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-4xl font-bold mx-auto mb-4 border-4 border-white dark:border-gray-800 shadow-md overflow-hidden relative z-10">
                    {user.profilePhoto ? (
                        <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-blue-600 dark:text-blue-400">{user.username.charAt(0).toUpperCase()}</span>
                    )}
                </div>
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">{user.email}</p>

                <div className="flex justify-center mt-6 relative z-10">
                    <Link to="/settings" className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium transition-colors border border-gray-200 dark:border-gray-600">
                        <Sliders size={18} />
                        {t('edit_profile')}
                    </Link>
                </div>
            </div>

            {/* Daily Savings History Grid */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-purple-500" size={20} />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('calendar_history')}</h2>
                    </div>
                    <span className="text-sm text-gray-500">{new Date().getFullYear()}</span>
                </div>
                <div className="p-6 overflow-x-auto">
                    <div className="flex flex-nowrap gap-6 min-w-max pb-4">
                        {months.map((month, mIdx) => (
                            <div key={mIdx} className="flex flex-col">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">{month.name}</span>
                                <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                        <span key={i} className="text-[10px] text-gray-400 font-medium">{day}</span>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {month.days.map((date, index) => {
                                        if (!date) {
                                            return <div key={`empty-${index}`} className="w-3 h-3"></div>;
                                        }
                                        const status = getStatusForDate(date);
                                        const isFuture = date > today;
                                        const defaultBg = isFuture ? 'bg-gray-100 dark:bg-gray-800/50 opacity-50' : status.color;

                                        return (
                                            <div
                                                key={index}
                                                className={`w-3 h-3 rounded-sm ${defaultBg} transition-all duration-200 hover:ring-2 hover:ring-blue-400 hover:scale-125 cursor-help`}
                                                title={`Date: ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}\nStatus: ${status.text}`}
                                            ></div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-700"></div>
                            <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                            <div className="w-3 h-3 rounded-sm bg-green-400"></div>
                            <div className="w-3 h-3 rounded-sm bg-green-600"></div>
                        </div>
                        <span>More</span>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Profile;
