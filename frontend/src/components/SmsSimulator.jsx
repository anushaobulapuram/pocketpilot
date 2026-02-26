import React, { useState, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { LanguageContext } from '../context/LanguageContext';

const smsTemplates = [
    "Your account credited with ₹2000 via UPI.",
    "INR 500 debited from your account at Amazon.",
    "Rs.1500 credited successfully.",
    "Rs.750 debited for Swiggy.",
    "Your a/c has been credited by Rs 5000 from Salary.",
    "₹1200 debited from your A/c for Uber rides."
];

const SmsSimulator = ({ onComplete, domains }) => {
    const { t } = useContext(LanguageContext);
    const [isOpen, setIsOpen] = useState(false);
    const [currentSms, setCurrentSms] = useState('');
    const [detectedData, setDetectedData] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categoryError, setCategoryError] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const generateSms = () => {
        const randomSms = smsTemplates[Math.floor(Math.random() * smsTemplates.length)];
        setCurrentSms(randomSms);
        parseSms(randomSms);
        setIsOpen(true);
        setSelectedCategory('');
        setCategoryError(false);
    };

    const parseSms = (sms) => {
        // Regex to extract amount (₹, Rs., INR)
        const amountMatch = sms.match(/(?:rs\.?|inr|₹)\s*(\d+(?:\.\d+)?)/i);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

        // Detect type based on keywords
        let type = '';
        if (/credited/i.test(sms)) {
            type = 'income';
        } else if (/debited/i.test(sms)) {
            type = 'expense';
        }

        if (amount > 0 && type) {
            setDetectedData({ amount, type });
        } else {
            setDetectedData(null); // Failed to parse
        }
    };

    const handleSave = async () => {
        if (!detectedData) return;

        if (detectedData.type === 'expense' && !selectedCategory) {
            setCategoryError(true);
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                'http://localhost:5000/api/finance/transactions/sms',
                {
                    amount: detectedData.amount,
                    type: detectedData.type,
                    domain_id: selectedCategory || null
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(t('transaction_saved'));

            // Voice Feedback
            if (detectedData.type === 'income') {
                const utterance = new SpeechSynthesisUtterance(`Income of ₹${detectedData.amount} added successfully.`);
                window.speechSynthesis.speak(utterance);
            } else if (detectedData.type === 'expense' && domains) {
                const domain = domains.find(d => d.id === selectedCategory);
                if (domain && domain.expected_amount > 0) {
                    const newSpent = domain.spent_amount + detectedData.amount;
                    const percentageUsed = Math.round((newSpent / domain.expected_amount) * 100);
                    const utterance = new SpeechSynthesisUtterance(`You have used ${percentageUsed} percent of your ${domain.name} budget.`);
                    window.speechSynthesis.speak(utterance);
                }
            }

            setIsOpen(false);
            if (onComplete) onComplete();
            window.dispatchEvent(new Event('transaction-updated'));
        } catch (error) {
            console.error("Failed to save SMS transaction", error);
            if (error.response && error.response.status === 409) {
                toast.error(t('sms_duplicate'));
                setIsOpen(false);
            } else {
                toast.error(t('error_network'));
            }
        } finally {
            setIsSaving(false);
        }
    };

    const dismissSms = () => {
        setIsOpen(false);
        setDetectedData(null);
    };

    return (
        <div className="relative">
            {/* Simulate SMS Button */}
            <button
                onClick={generateSms}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-2 font-medium"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                SMS
            </button>

            {/* Simulated SMS Card / Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative transform transition-all">
                        {/* Close button */}
                        <button
                            onClick={dismissSms}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-500/20 p-2 rounded-full">
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white">{t('sms_bank_message')}</h3>
                        </div>

                        {/* The simulated SMS content */}
                        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl mb-6 shadow-inner">
                            <p className="text-slate-300 font-mono text-sm leading-relaxed">
                                {currentSms}
                            </p>
                        </div>

                        <div className="border-t border-slate-700 pt-5 mt-2">
                            {detectedData ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${detectedData.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            {detectedData.type === 'income' ? t('income') : t('expense')} {t('detected')}
                                        </span>
                                    </div>

                                    {detectedData.type === 'income' ? (
                                        <>
                                            <p className="text-slate-200 text-center font-medium">
                                                {t('sms_detected_income', detectedData.amount, t('income'))}
                                            </p>
                                            <div className="flex gap-3 mt-4">
                                                <button onClick={dismissSms} className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium">{t('no')}</button>
                                                <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-medium flex justify-center items-center">
                                                    {isSaving ? (
                                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    ) : t('yes')}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-slate-200 text-center font-medium mb-3">
                                                {t('sms_detected_expense', detectedData.amount, t('expense'))}
                                            </p>
                                            <select
                                                value={selectedCategory}
                                                onChange={(e) => {
                                                    setSelectedCategory(e.target.value);
                                                    if (categoryError) setCategoryError(false);
                                                }}
                                                className={`w-full bg-slate-900 border text-white rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${categoryError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-transparent'}`}
                                            >
                                                <option value="" disabled>{t('select_category')}...</option>
                                                {domains && domains.map(domain => (
                                                    <option key={domain.id} value={domain.id}>{domain.name}</option>
                                                ))}
                                            </select>
                                            {categoryError && (
                                                <p className="text-red-400 text-xs mt-1 font-medium transition-opacity">{t('error_required')}</p>
                                            )}
                                            <div className="flex gap-3 mt-4">
                                                <button onClick={dismissSms} className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium">{t('cancel')}</button>
                                                <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium flex justify-center items-center">
                                                    {isSaving ? (
                                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    ) : t('confirm')}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-slate-400 text-sm mb-4">{t('sms_not_detected')}</p>
                                    <button onClick={dismissSms} className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium">{t('dismiss')}</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmsSimulator;
