import { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { HandHeart, LayoutDashboard, Target, Layers, Settings } from 'lucide-react';

const About = () => {
    const { t } = useContext(LanguageContext);

    const features = [
        {
            icon: <LayoutDashboard className="w-6 h-6 text-blue-500" />,
            title: "Dynamic Dashboard",
            desc: "Track income and expenses instantly. View auto-updating Recharts visualizations of your financial distributions."
        },
        {
            icon: <Target className="w-6 h-6 text-emerald-500" />,
            title: "Goal Tracking",
            desc: "Define financial targets and automatically calculate daily and monthly savings required to achieve them."
        },
        {
            icon: <Layers className="w-6 h-6 text-purple-500" />,
            title: "Custom Domains",
            desc: "Categorize expenses natively into diverse buckets and monitor expected budgets vs actual spending."
        },
        {
            icon: <Settings className="w-6 h-6 text-orange-500" />,
            title: "Global Preferences",
            desc: "Personalize your experience with dark/light themes and multi-language support (English, Telugu, Hindi)."
        }
    ];

    return (
        <div className="py-10 max-w-4xl mx-auto animate-fade-in">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                    {t('help')} & {t('About Us')}
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    PocketPilot is your unified personal finance platform designed to simplify money management, visualize data beautifully, and help you reach your savings goals faster.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {features.map((feat, idx) => (
                    <div key={idx} className="card hover:border-blue-500/50 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-4">
                            {feat.icon}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feat.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400">{feat.desc}</p>
                    </div>
                ))}
            </div>

            <div className="card text-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
                <div className="flex justify-center mb-4">
                    <HandHeart className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('Need Support?')}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {t('support_desc')}
                </p>
                <a href="mailto:support@pocketpilot.com" className="btn btn-primary inline-flex items-center gap-2">
                    {t('Contact Support')}
                </a>
            </div>
        </div>
    );
};

export default About;
