import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const Transactions = () => {
    const { token } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [domains, setDomains] = useState([]);
    const [editingTxnId, setEditingTxnId] = useState(null);
    const [editFormData, setEditFormData] = useState({ amount: '', type: 'expense', domain_id: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [txRes, domainsRes] = await Promise.all([
                    fetch('http://localhost:5000/api/finance/transactions', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('http://localhost:5000/api/finance/domains', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (txRes.ok && domainsRes.ok) {
                    setTransactions(await txRes.json());
                    setDomains(await domainsRes.json());
                } else {
                    toast.error(t('error_network'));
                }
            } catch (err) {
                toast.error(t('error_network'));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, t]);

    const handleEditClick = (txn) => {
        setEditingTxnId(txn.id);
        const domainId = domains.find(d => d.name === txn.domain_name)?.id || '';
        setEditFormData({
            amount: txn.amount,
            type: txn.type,
            domain_id: txn.type === 'expense' ? domainId : ''
        });
    };

    const handleCancelEdit = () => {
        setEditingTxnId(null);
    };

    const handleSaveEdit = async (txnId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/finance/transactions/${txnId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: Number(editFormData.amount),
                    type: editFormData.type,
                    domain_id: editFormData.domain_id
                })
            });

            if (res.ok) {
                toast.success(t('transaction_updated') || 'Transaction updated directly');

                // Refresh transactions list
                const txRes = await fetch('http://localhost:5000/api/finance/transactions', { headers: { 'Authorization': `Bearer ${token}` } });
                if (txRes.ok) {
                    setTransactions(await txRes.json());
                }

                setEditingTxnId(null);
            } else {
                const errData = await res.json();
                toast.error(errData.error || t('error_network'));
            }
        } catch (err) {
            toast.error(t('error_network'));
        }
    };

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
                                <th className="px-6 py-4 font-medium text-center">{t('actions') || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t('loading')}</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t('no_transactions')}</td>
                                </tr>
                            ) : (
                                transactions.map(txn => {
                                    const tDate = txn.date;
                                    const isEditing = editingTxnId === txn.id;
                                    return (
                                        <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                {new Date(tDate).toLocaleDateString()} {new Date(tDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>

                                            {isEditing ? (
                                                <>
                                                    <td className="px-6 py-4">
                                                        <select
                                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 dark:text-white"
                                                            value={editFormData.type}
                                                            onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value, domain_id: e.target.value === 'income' ? '' : editFormData.domain_id })}
                                                        >
                                                            <option value="expense">{t('expense')}</option>
                                                            <option value="income">{t('income')}</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <select
                                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 dark:text-white disabled:opacity-50"
                                                            value={editFormData.domain_id}
                                                            onChange={(e) => setEditFormData({ ...editFormData, domain_id: e.target.value })}
                                                            disabled={editFormData.type === 'income'}
                                                        >
                                                            <option value="">{t('select_category') || 'Select Category'}</option>
                                                            {domains.map(d => (
                                                                <option key={d.id} value={d.id}>{d.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-gray-500 dark:text-gray-400">{txn.description || '-'}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 dark:text-white text-right"
                                                            value={editFormData.amount}
                                                            onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-center space-x-2 whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleSaveEdit(txn.id)}
                                                            className="inline-flex items-center px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition"
                                                        >
                                                            {t('save') || 'Save'}
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                                        >
                                                            {t('cancel') || 'Cancel'}
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
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
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => handleEditClick(txn)}
                                                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                            title={t('edit') || 'Edit'}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </>
                                            )}
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
