import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { Calculator } from 'lucide-react';
import { toast } from 'react-toastify';

const BudgetPlanner = () => {
    const { token } = useContext(AuthContext);
    const { t, lang } = useContext(LanguageContext);

    const [domains, setDomains] = useState([]);
    const [totalBudget, setTotalBudget] = useState('');
    const [days, setDays] = useState('');
    const [selectedDomains, setSelectedDomains] = useState([]);
    const [plan, setPlan] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Calendar Simulation State
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [transactions, setTransactions] = useState([]);

    const months = [
        { value: 1, label: t('month_jan', 'January') },
        { value: 2, label: t('month_feb', 'February') },
        { value: 3, label: t('month_mar', 'March') },
        { value: 4, label: t('month_apr', 'April') },
        { value: 5, label: t('month_may', 'May') },
        { value: 6, label: t('month_jun', 'June') },
        { value: 7, label: t('month_jul', 'July') },
        { value: 8, label: t('month_aug', 'August') },
        { value: 9, label: t('month_sep', 'September') },
        { value: 10, label: t('month_oct', 'October') },
        { value: 11, label: t('month_nov', 'November') },
        { value: 12, label: t('month_dec', 'December') }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i); // Last 5 years

    const getVoiceLang = (appLang) => {
        switch (appLang) {
            case 'te': return 'te-IN';
            case 'hi': return 'hi-IN';
            case 'en':
            default: return 'en-IN';
        }
    };

    useEffect(() => {
        const fetchDomains = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/finance/domains', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDomains(res.data);
            } catch (error) {
                console.error('Failed to fetch domains', error);
                toast.error(t('error_network') || 'Failed to load domains');
            }
        };
        fetchDomains();
    }, [token, t]);

    // Fetch transactions when month or year changes
    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/finance/transactions?month=${selectedMonth}&year=${selectedYear}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTransactions(res.data);
            } catch (error) {
                console.error('Failed to fetch transactions', error);
            }
        };
        fetchTransactions();
    }, [selectedMonth, selectedYear, token]);

    const handleDomainToggle = (domainId) => {
        if (selectedDomains.includes(domainId)) {
            setSelectedDomains(selectedDomains.filter(id => id !== domainId));
        } else {
            setSelectedDomains([...selectedDomains, domainId]);
        }
    };

    const calculatePlan = () => {
        const budget = parseFloat(totalBudget);
        const numDays = parseInt(days, 10);

        if (!budget || budget <= 0) {
            toast.warn(t('invalid_budget') || 'Please enter a valid total budget');
            return;
        }
        if (!numDays || numDays <= 0) {
            toast.warn(t('invalid_days') || 'Please enter a valid number of days');
            return;
        }
        if (selectedDomains.length === 0) {
            toast.warn(t('select_domains_warning') || 'Please select at least one domain');
            return;
        }

        const selectedDomainData = domains.filter(d => selectedDomains.includes(d.id));

        // Calculate historical spending weights based on the fetched transactions for that month
        const expenses = transactions.filter(t => t.type === 'expense' && selectedDomains.includes(t.domain_id));

        let totalHistoricalSpent = 0;
        const spendingPerDomain = {};

        // Initialize with 0
        selectedDomains.forEach(id => {
            spendingPerDomain[id] = 0;
        });

        // Sum up expenses per domain
        expenses.forEach(tx => {
            if (spendingPerDomain[tx.domain_id] !== undefined) {
                spendingPerDomain[tx.domain_id] += tx.amount;
                totalHistoricalSpent += tx.amount;
            }
        });

        const dailyTotal = budget / numDays;

        const breakdown = selectedDomainData.map(d => {
            let proportion = 0;
            // Use historical proportional weighting if data exists, otherwise fallback to equal split
            if (totalHistoricalSpent > 0) {
                proportion = spendingPerDomain[d.id] / totalHistoricalSpent;
            } else {
                proportion = 1 / selectedDomainData.length;
            }

            const dailyLimit = dailyTotal * proportion;
            const totalLimit = dailyLimit * numDays;

            return {
                domainId: d.id,
                domainName: d.name,
                historicalSpent: spendingPerDomain[d.id], // Optional, to see what was used
                dailyLimit: Math.round(dailyLimit),
                totalLimit: Math.round(totalLimit)
            };
        });

        setPlan({
            breakdown,
            isFallback: totalHistoricalSpent === 0
        });
    };

    const savePlan = async () => {
        if (!plan) return;
        setIsSaving(true);
        try {
            await axios.post('http://localhost:5000/api/finance/budget-plan', {
                totalBudget: parseFloat(totalBudget),
                days: parseInt(days, 10),
                domains: selectedDomains,
                planBreakdown: plan.breakdown
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const successMsg = t('plan_saved') || 'Budget plan saved successfully!';
            toast.success(successMsg);

            const utterance = new SpeechSynthesisUtterance(successMsg);
            utterance.lang = getVoiceLang(lang);
            window.speechSynthesis.speak(utterance);

            // Reset after save
            setPlan(null);
            setTotalBudget('');
            setDays('');
            setSelectedDomains([]);
        } catch (error) {
            console.error('Failed to save budget plan', error);
            toast.error(t('error_network') || 'Failed to save plan');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-xl">
                    <Calculator className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t('budget_planner') || 'Budget Planner'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('budget_planner_desc') || 'Plan your spending across domains for a specific timeframe.'}
                    </p>
                </div>

                {/* Calendar / Month Selector for Simulation */}
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <select
                        value={selectedMonth}
                        onChange={(e) => {
                            setSelectedMonth(Number(e.target.value));
                            setPlan(null); // Reset plan on month change
                        }}
                        className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 outline-none cursor-pointer p-1"
                    >
                        {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => {
                            setSelectedYear(Number(e.target.value));
                            setPlan(null); // Reset plan on year change
                        }}
                        className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 outline-none cursor-pointer p-1"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inputs Section */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        {t('plan_configuration') || 'Plan Configuration'}
                    </h3>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                {t('total_budget') || 'Total Budget Amount'} (₹)
                            </label>
                            <input
                                type="number"
                                value={totalBudget}
                                onChange={(e) => setTotalBudget(e.target.value)}
                                placeholder="e.g. 5000"
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                {t('number_of_days') || 'Number of Days'}
                            </label>
                            <input
                                type="number"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                placeholder="e.g. 10"
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                {t('select_domains_plan') || 'Select Domains'}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {domains.map(domain => (
                                    <div
                                        key={domain.id}
                                        onClick={() => handleDomainToggle(domain.id)}
                                        className={`cursor-pointer border rounded-xl px-3 py-2 flex items-center justify-between transition-colors ${selectedDomains.includes(domain.id) ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-70'}`}
                                    >
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{domain.name}</span>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedDomains.includes(domain.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                            {selectedDomains.includes(domain.id) && (
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={calculatePlan}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl transition-colors mt-4 shadow-sm"
                        >
                            {t('generate_plan') || 'Generate Plan'}
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        {t('suggested_spending_plan') || 'Suggested Spending Plan'}
                    </h3>

                    {plan ? (
                        <div className="flex-1 flex flex-col">
                            <div className={`rounded-xl p-4 mb-6 border ${plan.isFallback ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/30'}`}>
                                <p className={`text-sm ${plan.isFallback ? 'text-amber-800 dark:text-amber-300' : 'text-indigo-800 dark:text-indigo-300'}`}>
                                    {plan.isFallback
                                        ? (t('plan_fallback_notice') || `No spending data found for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}. Falling back to an equal distribution.`)
                                        : (t('plan_historical_notice') || `Suggested spending plan based on your previous spending behavior from ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}.`)
                                    }
                                </p>
                            </div>

                            <div className="overflow-x-auto mb-6 flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400">
                                            <th className="pb-3 px-2">{t('domain') || 'Domain'}</th>
                                            <th className="pb-3 px-2 text-right">{t('daily_limit') || 'Daily Limit'}</th>
                                            <th className="pb-3 px-2 text-right">{t('total_limit') || 'Total Limit'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {plan.breakdown.map(p => (
                                            <tr key={p.domainId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="py-4 px-2 font-medium text-gray-900 dark:text-white">
                                                    {p.domainName}
                                                </td>
                                                <td className="py-4 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                    ₹{p.dailyLimit}<span className="text-xs text-gray-400 font-normal">/{t('day') || 'day'}</span>
                                                </td>
                                                <td className="py-4 px-2 text-right font-medium text-gray-600 dark:text-gray-300">
                                                    ₹{p.totalLimit}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                onClick={savePlan}
                                disabled={isSaving}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-sm flex justify-center items-center mt-auto"
                            >
                                {isSaving ? '...' : (t('save_plan') || 'Save Plan')}
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                            <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs">
                                {t('plan_empty_state') || 'Configure your inputs and click generate to see your suggested spending breakdown here.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BudgetPlanner;
