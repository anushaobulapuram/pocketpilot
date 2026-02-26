import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const GoalSetup = () => {
    const [goals, setGoals] = useState([]);
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [months, setMonths] = useState('');
    const { token } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);

    useEffect(() => {
        fetchGoals();
    }, []);

    const fetchGoals = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/goals', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setGoals(await res.json());
        } catch (err) {
            toast.error(t('error_network'));
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name, target_amount: Number(targetAmount), months: Number(months) })
            });
            if (res.ok) {
                setName(''); setTargetAmount(''); setMonths('');
                toast.success(t('domain_saved'));
                fetchGoals();
            } else {
                toast.error(t('error_network'));
            }
        } catch (err) {
            toast.error(t('error_network'));
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('goals')}</h2>

            <div className="card">
                <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-200">{t('create_goal')}</h3>
                <form onSubmit={handleCreate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="form-group">
                            <label>{t('goal_name')}</label>
                            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>{t('target_amount')}</label>
                            <input type="number" className="form-input" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>{t('months_to_achieve')}</label>
                            <input type="number" className="form-input" value={months} onChange={e => setMonths(e.target.value)} required />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary">{t('create_goal')}</button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map(g => (
                    <div key={g.id} className="card flex flex-col h-full">
                        <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">{g.name}</h3>
                        <div className="space-y-2 mb-6 flex-1 text-gray-700 dark:text-gray-300">
                            <p><strong className="font-semibold text-gray-900 dark:text-white">{t('target_amount')}:</strong> ${g.target_amount}</p>
                            <p><strong className="font-semibold text-gray-900 dark:text-white">{t('months_to_achieve')}:</strong> {g.months}</p>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{t('monthly_savings')}: <span className="text-gray-900 dark:text-white">${g.monthly_savings}</span></p>
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{t('daily_savings')}: <span className="text-gray-900 dark:text-white">${g.daily_savings}</span></p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GoalSetup;
