import { useState, useEffect, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { toast } from 'react-toastify';
import { X, Edit2, Trash2, Check, X as CancelIcon } from 'lucide-react';

const DailySnapshotModal = ({ isOpen, onClose, date, token, onUpdate }) => {
    const { t } = useContext(LanguageContext);
    const [transactions, setTransactions] = useState([]);
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add Form State
    const [addType, setAddType] = useState('expense');
    const [addAmount, setAddAmount] = useState('');
    const [addDomainId, setAddDomainId] = useState('');
    const [addDescription, setAddDescription] = useState('');

    // Edit State
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // 30 days logic
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const isEditable = date >= thirtyDaysAgo && date <= today;

    useEffect(() => {
        if (isOpen && date) {
            fetchData();
        }
    }, [isOpen, date]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const m = date.getMonth() + 1;
            const y = date.getFullYear();
            const dateStr = date.toISOString().split('T')[0];

            const [transRes, domainRes] = await Promise.all([
                fetch(`http://localhost:5000/api/finance/transactions?month=${m}&year=${y}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('http://localhost:5000/api/finance/domains', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (transRes.ok && domainRes.ok) {
                const transData = await transRes.json();
                const domainData = await domainRes.json();

                // Filter exact date
                const filtered = transData.filter(t => t.date.split('T')[0] === dateStr);
                // Sort by time ascending
                filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
                setTransactions(filtered);
                setDomains(domainData);
            }
        } catch (err) {
            toast.error(t('error_network') || 'Network Error');
        }
        setLoading(false);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            // Need accurate ISO string including hours to save new items with the target date context. 
            // Setting date dynamically via current time on target date block.
            const newDate = new Date(date);
            const now = new Date();
            newDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

            const res = await fetch('http://localhost:5000/api/finance/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    amount: Number(addAmount),
                    type: addType,
                    domain_id: addType === 'expense' ? addDomainId : null,
                    description: addDescription,
                    source: 'manual',
                    date: newDate.toISOString()
                })
            });
            if (res.ok) {
                toast.success(t('transaction_saved') || 'Saved');
                setAddAmount(''); setAddDescription(''); setAddDomainId('');
                fetchData();
                onUpdate();
            } else {
                toast.error(t('error_network') || 'Error');
            }
        } catch (err) {
            toast.error(t('error_network') || 'Error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('confirm_delete') || 'Are you sure you want to delete this transaction?')) return;
        try {
            const res = await fetch(`http://localhost:5000/api/finance/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success(t('deleted_successfully') || 'Deleted');
                fetchData();
                onUpdate();
            }
        } catch (err) {
            toast.error(t('error_network') || 'Error');
        }
    };

    const startEdit = (t) => {
        setEditingId(t.id);
        setEditForm({
            amount: t.amount,
            type: t.type,
            domain_id: t.domain_id || '',
            description: t.description || ''
        });
    };

    const saveEdit = async (id) => {
        try {
            const res = await fetch(`http://localhost:5000/api/finance/transactions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    amount: Number(editForm.amount),
                    type: editForm.type,
                    domain_id: editForm.type === 'expense' ? editForm.domain_id || null : null,
                    description: editForm.description
                })
            });
            if (res.ok) {
                toast.success(t('saved_successfully') || 'Edited');
                setEditingId(null);
                fetchData();
                onUpdate();
            } else {
                toast.error(t('error_network') || 'Error');
            }
        } catch (err) {
            toast.error(t('error_network') || 'Error');
        }
    };

    if (!isOpen || !date) return null;

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome - totalExpense;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="Close">
                    <X size={24} />
                </button>

                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Daily Snapshot: {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h2>

                    {!isEditable && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400 px-4 py-3 rounded-xl mb-6 font-medium text-sm">
                            Editing is available only for the past 30 days.
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 mt-4">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-inner">
                            <p className="text-sm font-medium text-gray-500 mb-1">Total Income</p>
                            <p className="text-2xl font-bold text-emerald-600">${totalIncome.toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-inner">
                            <p className="text-sm font-medium text-gray-500 mb-1">Total Expense</p>
                            <p className="text-2xl font-bold text-red-600">${totalExpense.toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-inner">
                            <p className="text-sm font-medium text-gray-500 mb-1">Net Savings</p>
                            <p className={`text-2xl font-bold ${netSavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>${netSavings.toFixed(2)}</p>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transactions</h3>

                    {loading ? (
                        <p className="text-gray-500">{t('loading') || 'Loading...'}</p>
                    ) : transactions.length === 0 ? (
                        <p className="text-gray-500 italic mb-6">No transactions found for this date.</p>
                    ) : (
                        <div className="overflow-x-auto mb-8 border border-gray-200 dark:border-gray-700 rounded-xl">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3">Time</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Domain</th>
                                        <th className="px-4 py-3">Description</th>
                                        <th className="px-4 py-3">Amount</th>
                                        {isEditable && <th className="px-4 py-3 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            {editingId === tx.id ? (
                                                <>
                                                    <td className="px-4 py-3">
                                                        {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })} className="form-input text-xs p-1.5 rounded bg-white dark:bg-gray-700">
                                                            <option value="expense">Expense</option>
                                                            <option value="income">Income</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {editForm.type === 'expense' ? (
                                                            <select value={editForm.domain_id} onChange={e => setEditForm({ ...editForm, domain_id: e.target.value })} className="form-input text-xs p-1.5 rounded bg-white dark:bg-gray-700">
                                                                <option value="">Select Domain</option>
                                                                {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                            </select>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="form-input text-xs p-1.5 w-full rounded bg-white dark:bg-gray-700" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} className="form-input text-xs p-1.5 w-20 rounded bg-white dark:bg-gray-700" />
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => saveEdit(tx.id)} className="text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 p-1.5 rounded-lg mr-2" title="Save"><Check size={16} /></button>
                                                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded-lg" title="Cancel"><CancelIcon size={16} /></button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3 whitespace-nowrap">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="px-4 py-3 capitalize">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                            {tx.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{tx.domain_name || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{tx.description || '—'}</td>
                                                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">${tx.amount.toFixed(2)}</td>
                                                    {isEditable && (
                                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                                            <button onClick={() => startEdit(tx)} className="text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 p-1.5 rounded-lg mr-2 transition-colors" title="Edit"><Edit2 size={16} /></button>
                                                            <button onClick={() => handleDelete(tx.id)} className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 p-1.5 rounded-lg transition-colors" title="Delete"><Trash2 size={16} /></button>
                                                        </td>
                                                    )}
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {isEditable && (
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-800/30">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 text-sm tracking-wide uppercase">Add Transaction for {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</h4>
                            <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-3">
                                <select value={addType} onChange={e => setAddType(e.target.value)} className="form-input text-sm py-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700">
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                </select>
                                <input type="number" placeholder="Amount" required value={addAmount} onChange={e => setAddAmount(e.target.value)} className="form-input text-sm py-2 w-32 rounded-lg bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700" />
                                {addType === 'expense' && (
                                    <select value={addDomainId} onChange={e => setAddDomainId(e.target.value)} className="form-input text-sm py-2 flex-1 min-w-[150px] rounded-lg bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700" required>
                                        <option value="">Select Domain</option>
                                        {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                )}
                                <input type="text" placeholder="Description (Optional)" value={addDescription} onChange={e => setAddDescription(e.target.value)} className="form-input text-sm py-2 flex-1 min-w-[150px] rounded-lg bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700" />
                                <button type="submit" className="btn btn-primary text-sm py-2 px-6 shadow-sm hover:translate-y-[-1px] transition-transform">Save Entry</button>
                            </form>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default DailySnapshotModal;
