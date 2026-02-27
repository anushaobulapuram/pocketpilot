import { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { X, Mic, MicOff, Download, Save, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VoiceBudgetModal = ({ isOpen, onClose, onPlanSaved }) => {
    const { token } = useContext(AuthContext);
    const { lang } = useContext(LanguageContext);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [parsedData, setParsedData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const modalRef = useRef(null);

    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    useEffect(() => {
        if (!isOpen) {
            setIsListening(false);
            setTranscript('');
            setParsedData(null);
        }
    }, [isOpen]);

    const startListening = () => {
        if (!recognition) {
            toast.error("Speech Recognition is not supported in this browser.");
            return;
        }

        // Match language roughly based on app settings or let it auto-detect open ended
        recognition.lang = lang === 'te' ? 'te-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            setTranscript('');
            setParsedData(null);
        };

        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript.toLowerCase();
            setTranscript(speechResult);
            parseVoiceInput(speechResult);
        };

        recognition.onerror = (event) => {
            console.error("Speech Recognition Error", event.error);
            setIsListening(false);
            toast.error("Error recognizing speech. Please try again.");
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const stopListening = () => {
        if (recognition) {
            recognition.stop();
            setIsListening(false);
        }
    };

    const parseVoiceInput = (text) => {
        // Simple NLP Rules for Amount and Duration
        // Example: "20000 rupees for 30 days" or "10000 hai 20 din"

        let amount = null;
        let duration = null;

        // Extract numbers
        const numbers = text.match(/\d+/g);

        if (numbers && numbers.length > 0) {
            // Usually the largest number is the amount, and the smaller is the duration
            // Or we check context based on words
            const numVals = numbers.map(Number);

            // Logic: Assume amount is > 1000 or the larger number, duration is smaller
            if (numVals.length === 1) {
                // Only one number found, ask for clarification later
                amount = numVals[0];
            } else {
                amount = Math.max(...numVals);
                duration = Math.min(...numVals);
            }
        }

        // Check for months vs days
        if (text.includes('month') || text.includes('mahine') || text.includes('nelalu')) {
            if (duration) duration = duration * 30; // approx
            else duration = 30; // "for a month" fallback
        } else if (!duration && (text.includes('day') || text.includes('din') || text.includes('roju'))) {
            // Try to extract if only days were said somehow (unlikely to have 0 numbers but "ten days")
            // Basic fallback
            if (amount < 100) {
                duration = amount;
                amount = null;
            }
        }

        if (!amount || !duration) {
            toast.info("Could not fully understand amount or duration. Please try again.");
            return;
        }

        generatePlan(amount, duration, text);
    };

    const generatePlan = (amount, duration, originalText) => {
        const dailyAllowed = amount / duration;
        const weeklyBudget = dailyAllowed * 7;

        const generatedPlan = {
            dailyAllowed: Math.round(dailyAllowed),
            weeklyBudget: Math.round(weeklyBudget),
            emergencyBuffer: Math.round(amount * 0.10),
            savingsSuggestion: Math.round(amount * 0.10),
            categories: {
                essentials: Math.round(amount * 0.50),
                food: Math.round(amount * 0.20),
                transport: Math.round(amount * 0.10),
                savings: Math.round(amount * 0.10),
                misc: Math.round(amount * 0.10)
            }
        };

        setParsedData({
            originalText,
            amount,
            duration,
            generatedPlan
        });
    };

    const savePlan = async () => {
        if (!parsedData) return;
        setIsSaving(true);
        try {
            await axios.post(`${API_URL}/finance/voice-plan`, {
                originalText: parsedData.originalText,
                parsedAmount: parsedData.amount,
                parsedDuration: parsedData.duration,
                generatedPlan: parsedData.generatedPlan
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Voice plan saved successfully!");
            if (onPlanSaved) onPlanSaved();
            else onClose();
        } catch (error) {
            console.error("Error saving voice plan", error);
            toast.error("Failed to save plan.");
        } finally {
            setIsSaving(false);
        }
    };

    const exportToPDF = async () => {
        if (!modalRef.current || !parsedData) return;
        try {
            const canvas = await html2canvas(modalRef.current);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('PocketPilot_Voice_Plan.pdf');
        } catch (err) {
            console.error("PDF Export Error", err);
            toast.error("Failed to export PDF.");
        }
    };

    if (!isOpen) return null;

    const categoryChartData = parsedData ? [
        { name: 'Essentials', value: parsedData.generatedPlan.categories.essentials, color: '#3b82f6' },
        { name: 'Food', value: parsedData.generatedPlan.categories.food, color: '#f59e0b' },
        { name: 'Transport', value: parsedData.generatedPlan.categories.transport, color: '#10b981' },
        { name: 'Savings', value: parsedData.generatedPlan.categories.savings, color: '#8b5cf6' },
        { name: 'Misc', value: parsedData.generatedPlan.categories.misc, color: '#ef4444' }
    ] : [];

    const dailyWeeklyChartData = parsedData ? [
        { name: 'Daily Budget', amount: parsedData.generatedPlan.dailyAllowed, color: '#10b981' },
        { name: 'Weekly Budget', amount: parsedData.generatedPlan.weeklyBudget, color: '#3b82f6' }
    ] : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-800"
                ref={modalRef}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/20 transition-colors"
                        data-html2canvas-ignore="true"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-bold mb-2">AI Voice Budget Planner</h2>
                    <p className="text-blue-100 opacity-90">Speak your budget and let AI plan it for you.</p>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh]">

                    {/* Voice Input Section */}
                    <div className="flex flex-col items-center justify-center mb-8" data-html2canvas-ignore="true">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={isListening ? stopListening : startListening}
                            className={`p-6 rounded-full shadow-lg mb-4 transition-all ${isListening
                                ? 'bg-red-500 hover:bg-red-600 animate-pulse ring-4 ring-red-500/30'
                                : 'bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-600/20'
                                }`}
                        >
                            {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                        </motion.button>

                        <div className="text-center min-h-[3rem]">
                            {isListening ? (
                                <p className="text-slate-500 dark:text-slate-400 italic">Listening... Speak now 🎙️</p>
                            ) : transcript ? (
                                <p className="text-slate-700 dark:text-slate-300 font-medium font-mono text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                                    "{transcript}"
                                </p>
                            ) : (
                                <p className="text-slate-500 dark:text-slate-400">
                                    Try: "I have 50000 rupees for 30 days"
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Results Section */}
                    <AnimatePresence>
                        {parsedData && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 text-center">
                                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Total Amount</p>
                                        <p className="text-2xl font-bold text-slate-800 dark:text-white">₹{parsedData.amount}</p>
                                    </div>
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 text-center">
                                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1">Duration</p>
                                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{parsedData.duration} Days</p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 text-center">
                                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Daily Limit</p>
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{parsedData.generatedPlan.dailyAllowed}</p>
                                    </div>
                                    <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-2xl border border-violet-100 dark:border-violet-800/50 text-center">
                                        <p className="text-sm text-violet-600 dark:text-violet-400 font-medium mb-1">Weekly Limit</p>
                                        <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">₹{parsedData.generatedPlan.weeklyBudget}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Daily vs Weekly Budget</h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={dailyWeeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                                        {dailyWeeklyChartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Strategy & Buffer</h3>

                                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30">
                                            <div>
                                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">Emergency Buffer (10%)</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Keep aside for unexpected costs</p>
                                            </div>
                                            <p className="text-lg font-bold text-red-600 dark:text-red-400">₹{parsedData.generatedPlan.emergencyBuffer}</p>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                            <div>
                                                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Guaranteed Savings (10%)</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Save this before you spend</p>
                                            </div>
                                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{parsedData.generatedPlan.savingsSuggestion}</p>
                                        </div>

                                        <div className="pt-4" data-html2canvas-ignore="true">
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={savePlan}
                                                    disabled={isSaving}
                                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-70"
                                                >
                                                    {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                                    Save Plan
                                                </button>
                                                <button
                                                    onClick={exportToPDF}
                                                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white py-3 px-4 rounded-xl font-medium transition-colors"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </motion.div>
        </div>
    );
};

export default VoiceBudgetModal;
