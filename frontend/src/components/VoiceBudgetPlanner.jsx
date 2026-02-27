import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { toast } from 'react-toastify';
import { X, Mic, MicOff, Save, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const VoiceBudgetPlanner = ({ isOpen, onClose, onPlanSaved }) => {
    const { token } = useContext(AuthContext);
    const { t, lang } = useContext(LanguageContext);

    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [amount, setAmount] = useState(null);
    const [duration, setDuration] = useState(null);
    const [calculatedPlan, setCalculatedPlan] = useState(null);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const recognitionRef = useRef(null);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;

            // Set language based on app context
            switch (lang) {
                case 'te':
                    recognitionRef.current.lang = 'te-IN';
                    break;
                case 'hi':
                    recognitionRef.current.lang = 'hi-IN';
                    break;
                default:
                    recognitionRef.current.lang = 'en-IN';
            }

            recognitionRef.current.onresult = (event) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    currentTranscript += event.results[i][0].transcript;
                }
                setTranscript(currentTranscript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                if (event.error !== 'no-speech') {
                    toast.error(`Recording error: ${event.error}`);
                }
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                if (transcript) {
                    parseVoiceInput(transcript);
                }
            };
        }
    }, [lang, transcript]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            setAmount(null);
            setDuration(null);
            setCalculatedPlan(null);
            setFeedbackMsg('Listening for budget amount and days...');
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    // --- Rule-Based Parser ---
    const parseVoiceInput = (text) => {
        const lowerText = text.toLowerCase();
        let extractedAmount = amount;
        let extractedDuration = duration;

        // 1. Extract Amount (Looking for the largest realistic number first, or first sequence of digits)
        const numberMatches = lowerText.match(/\d+(?:[.,]\d+)?/g);
        if (numberMatches && !extractedAmount) {
            // Sort numbers by size descending, typically amount is larger than days
            const numbers = numberMatches.map(n => parseFloat(n.replace(/,/g, '')));

            if (numbers.length > 0) {
                // If the user says "20000 limit for 30 days", numbers are [20000, 30]
                extractedAmount = Math.max(...numbers);

                // If there's another number, it might be the duration
                if (numbers.length > 1) {
                    const possibleDuration = numbers.find(n => n !== extractedAmount);
                    if (possibleDuration && possibleDuration < 366) { // Sanity check for days
                        extractedDuration = possibleDuration;
                    }
                }
            }
        }

        // 2. Extract Duration Explicitly
        if (!extractedDuration) {
            // Check for days
            const dayMatch = lowerText.match(/(\d+)\s*(days|din|rojulu)/i);
            if (dayMatch) {
                extractedDuration = parseInt(dayMatch[1]);
            } else {
                // Check for months
                const monthMatch = lowerText.match(/(\d+)\s*(months|mahine|nelalu|month|mahina|nela)/i);
                if (monthMatch) {
                    extractedDuration = parseInt(monthMatch[1]) * 30; // convert months to days
                }
            }
        }

        setAmount(extractedAmount);
        setDuration(extractedDuration);

        // 3. Evaluate results and prompt or calculate
        if (!extractedAmount) {
            setFeedbackMsg('What is the total amount available?');
        } else if (!extractedDuration) {
            setFeedbackMsg('How many days should this budget last?');
        } else {
            setFeedbackMsg('Budget plan generated successfully!');
            generatePlan(extractedAmount, extractedDuration);
        }
    };

    // --- Generate Plan ---
    const generatePlan = (totalAmount, durationDays) => {
        const dailyBudget = totalAmount / durationDays;
        const weeklyBudget = dailyBudget * 7;
        const emergencyBuffer = totalAmount * 0.10;
        const savingsSuggestion = totalAmount * 0.10;

        // Category Split based on remaining amount (Total - Buffer - Savings = 80%)
        // Rule says: Essen 50%, Food 20%, Trans 10%, Save 10%, Misc 10%
        // We'll apply it directly to total amount
        const essentials = totalAmount * 0.50;
        const food = totalAmount * 0.20;
        const transport = totalAmount * 0.10;
        const savings = totalAmount * 0.10;
        const misc = totalAmount * 0.10;

        setCalculatedPlan({
            dailyAllowed: dailyBudget,
            weeklyBudget: weeklyBudget,
            emergencyBuffer: emergencyBuffer,
            savingsSuggestion: savingsSuggestion,
            categories: { essentials, food, transport, savings, misc }
        });
    };

    const handleSavePlan = async () => {
        if (!amount || !duration || !calculatedPlan) return;
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/finance/voice-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    originalText: transcript || `Manual override: ${amount} for ${duration} days`,
                    parsedAmount: amount,
                    parsedDuration: duration,
                    generatedPlan: calculatedPlan
                })
            });

            if (response.ok) {
                toast.success('Voice Budget Plan saved successfully!');
                if (onPlanSaved) onPlanSaved();
                onClose();
            } else {
                toast.error('Failed to save plan');
            }
        } catch (error) {
            console.error(error);
            toast.error('Network error while saving plan');
        }
        setLoading(false);
    };

    const handleExportPDF = () => {
        // A simple print mechanism. Ideally, use jspdf or html2pdf.
        window.print();
    };

    if (!isOpen) return null;

    // Charts Data
    const chartData = calculatedPlan ? [
        {
            name: 'Budget Comparison',
            Daily: parseFloat(calculatedPlan.dailyAllowed.toFixed(2)),
            Weekly: parseFloat(calculatedPlan.weeklyBudget.toFixed(2))
        }
    ] : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                            Voice Budget Planner
                        </h2>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Rule-based smart budget allocation</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-6 overflow-y-auto print-section flex-1">

                    {/* Voice Interface */}
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-8 mb-8 border border-blue-100 dark:border-blue-900/30 flex flex-col items-center justify-center relative overflow-hidden">

                        {/* Glowing Background Animation */}
                        {isListening && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-48 h-48 bg-blue-400/20 dark:bg-blue-500/20 rounded-full animate-ping"></div>
                                <div className="absolute w-64 h-64 bg-indigo-400/10 dark:bg-indigo-500/10 rounded-full animate-pulse delay-75"></div>
                            </div>
                        )}

                        <button
                            onClick={toggleListening}
                            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all transform hover:scale-105 ${isListening
                                ? 'bg-gradient-to-br from-red-500 to-pink-600 shadow-red-500/30'
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'
                                }`}
                        >
                            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                        </button>

                        <div className="mt-6 text-center relative z-10 w-full">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                                {isListening ? 'Listening...' : 'Tap to Speak'}
                            </h3>

                            <p className="text-sm text-gray-500 dark:text-gray-400 h-8 font-medium">
                                {transcript || "e.g., 'I have 20000 rupees for 30 days'"}
                            </p>

                            {feedbackMsg && !isListening && (
                                <p className={`mt-4 font-semibold text-sm py-2 px-4 rounded-full inline-block ${calculatedPlan
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    }`}>
                                    {feedbackMsg}
                                </p>
                            )}
                        </div>

                        {/* Voice Listening Wave Animation (Simulated) */}
                        {isListening && (
                            <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
                        )}
                    </div>

                    {/* Manual Fallback (if parser misses something) */}
                    {(!calculatedPlan && amount !== null && duration === null) || (!calculatedPlan && amount === null && duration !== null) ? (
                        <div className="flex gap-4 mb-6">
                            <input
                                type="number"
                                placeholder="Total Amount"
                                className="form-input flex-1"
                                value={amount || ''}
                                onChange={(e) => setAmount(parseFloat(e.target.value))}
                            />
                            <input
                                type="number"
                                placeholder="Duration (Days)"
                                className="form-input flex-1"
                                value={duration || ''}
                                onChange={(e) => setDuration(parseInt(e.target.value))}
                            />
                            <button
                                onClick={() => { if (amount && duration) generatePlan(amount, duration) }}
                                className="btn btn-primary"
                                disabled={!amount || !duration}
                            >
                                Calculate
                            </button>
                        </div>
                    ) : null}

                    {/* Generated Plan Display */}
                    {calculatedPlan && (
                        <div className="space-y-6 animate-fade-in pb-8">

                            {/* Top Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Total</p>
                                    <p className="text-xl font-black text-gray-900 dark:text-white">${amount}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Days</p>
                                    <p className="text-xl font-black text-gray-900 dark:text-white">{duration}</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Daily Limit</p>
                                    <p className="text-xl font-black text-blue-700 dark:text-blue-300">${calculatedPlan.dailyAllowed.toFixed(0)}</p>
                                </div>
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">Weekly</p>
                                    <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">${calculatedPlan.weeklyBudget.toFixed(0)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Chart */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Pacing Overview</h4>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Legend iconType="circle" />
                                                <Bar dataKey="Daily" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                                <Bar dataKey="Weekly" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Category Split */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Suggested Allocation</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-gray-600 dark:text-gray-400 font-medium">Essentials (50%)</span></div>
                                            <span className="font-bold text-gray-900 dark:text-white">${calculatedPlan.categories.essentials.toFixed(0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-gray-600 dark:text-gray-400 font-medium">Food (20%)</span></div>
                                            <span className="font-bold text-gray-900 dark:text-white">${calculatedPlan.categories.food.toFixed(0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-gray-600 dark:text-gray-400 font-medium">Transport (10%)</span></div>
                                            <span className="font-bold text-gray-900 dark:text-white">${calculatedPlan.categories.transport.toFixed(0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="text-gray-600 dark:text-gray-400 font-medium">Savings (10%)</span></div>
                                            <span className="font-bold text-gray-900 dark:text-white">${calculatedPlan.categories.savings.toFixed(0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-500"></div><span className="text-gray-600 dark:text-gray-400 font-medium">Misc (10%)</span></div>
                                            <span className="font-bold text-gray-900 dark:text-white">${calculatedPlan.categories.misc.toFixed(0)}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div><span className="text-rose-600 dark:text-rose-400 font-bold">Emergency Buffer</span></div>
                                        <span className="font-black text-rose-600 dark:text-rose-400">${calculatedPlan.emergencyBuffer.toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                {calculatedPlan && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex gap-4 no-print">
                        <button
                            onClick={handleExportPDF}
                            className="flex-1 py-3 px-4 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Download size={18} /> Export PDF
                        </button>
                        <button
                            onClick={handleSavePlan}
                            disabled={loading}
                            className="flex-1 py-3 px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5"
                        >
                            {loading ? 'Saving...' : <><Save size={18} /> Save Plan</>}
                        </button>
                    </div>
                )}

            </div>

            <style jsx>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-section, .print-section * {
                        visibility: visible;
                    }
                    .print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default VoiceBudgetPlanner;
