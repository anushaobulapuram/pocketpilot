import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { LayoutDashboard, FileText, Target, User, Settings, HelpCircle, LogOut, Calculator } from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);
    const location = useLocation();

    if (!user) return null;

    const navLinks = [
        { path: '/', label: t('dashboard'), icon: LayoutDashboard },
        { path: '/transactions', label: t('transaction_history'), icon: FileText },
        { path: '/goals', label: t('goals'), icon: Target },
        { path: '/budget-planner', label: t('budget_planner') || 'Budget Planner', icon: Calculator },
        { path: '/profile', label: t('profile'), icon: User },
        { path: '/settings', label: t('settings'), icon: Settings },
        { path: '/about', label: t('help'), icon: HelpCircle },
    ];

    return (
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen flex flex-col fixed left-0 top-0 transition-colors">
            <div className="p-6">
                <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    🚀 PocketPilot
                </Link>
            </div>

            <div className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
                {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Icon size={20} />
                            {link.label}
                        </Link>
                    )
                })}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.username}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                    <LogOut size={18} />
                    {t('logout')}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
