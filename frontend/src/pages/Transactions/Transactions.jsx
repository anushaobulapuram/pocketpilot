import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const Transactions = () => {
    const { token } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/finance/transactions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTransactions(data);
                } else {
                    toast.error(t('error_network'));
                }
            } catch (err) {
                toast.error(t('error_network'));
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [token]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('transaction_history')}</h2>
                <span className="text-gray-500 dark:text-gray-400 font-medium">{t('total_entries', transactions.length)}</span>
            </div>

            <div className="card overflow-hidden !p-0 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">{t('date')}</th>
                                <th className="px-6 py-4 font-medium">{t('type')}</th>
                                <th className="px-6 py-4 font-medium">{t('domain')}</th>
                                <th className="px-6 py-4 font-medium">{t('description')}</th>
                                <th className="px-6 py-4 font-medium text-right">{t('amount')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">{t('loading')}</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">{t('no_transactions')}</td>
                                </tr>
                            ) : (
                                transactions.map(txn => {
                                    const tDate = txn.date;
                                    return (
                                        <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                {new Date(tDate).toLocaleDateString()} {new Date(tDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className={`px-6 py-4 font-medium capitalize ${txn.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {txn.type === 'income' ? t('income') : t('expense')}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{txn.domain_name || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500 dark:text-gray-400">{txn.description || '-'}</span>
                                                    {txn.source === 'sms' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 flex-shrink-0">
                                                            {t('sms_bank_message')}
                                                        </span>
                                                    )}
                                                    {txn.source === 'voice' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 flex-shrink-0">
                                                            {t('voice_ai')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                ${txn.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Transactions;
