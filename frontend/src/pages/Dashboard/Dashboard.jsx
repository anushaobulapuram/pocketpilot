import { useEffect, useState, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'react-toastify';
import { Mic, MicOff } from 'lucide-react';
import SmsSimulator from '../../components/SmsSimulator';
import VoiceBudgetModal from '../../components/VoiceBudgetModal';

const Dashboard = () => {
    const { token } = useContext(AuthContext);
    const { t, tVoice, lang } = useContext(LanguageContext);
    const [summary, setSummary] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [goals, setGoals] = useState([]);
    const [latestVoicePlan, setLatestVoicePlan] = useState(null);

    const [amount, setAmount] = useState('');
    const [type, setType] = useState('expense');
    const [domainId, setDomainId] = useState('');
    const [manualCategoryError, setManualCategoryError] = useState(false);
    const [description, setDescription] = useState('');
    const [newDomainName, setNewDomainName] = useState('');
    const [newDomainExpected, setNewDomainExpected] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [smsText, setSmsText] = useState('');
    const [isVoiceBudgetOpen, setIsVoiceBudgetOpen] = useState(false);

    // --- Voice Assistant State Machine ---
    const [voiceState, setVoiceState] = useState({
        isActive: false,
        stage: 'idle', // idle, askingType, askingCategory, askingGoal
        pendingAmount: null,
        pendingType: null,
        pendingDomainId: null,
        pendingGoalId: null,
        lastSpeechText: '',
        lastSpeechTimestamp: 0,
        promptMessage: '',
        transcript: '',
        activeLang: 'en'
    });

    const VOICE_KEYWORDS = {
        income: ['income', 'add', 'credit', 'received', 'got', 'earn', 'salary', 'aadaayam', 'aay', 'ఆదాయం', 'आय', 'జోడించు', 'जोड़ो'],
        expense: ['expense', 'spend', 'spent', 'debit', 'kharchu', 'kharcha', 'paid', 'pay', 'to', 'ఖర్చు', 'डబ్బు', 'खर्च', 'पैसा']
    };

    // Ref to hold current state for the speech engine closure
    const voiceStateRef = useRef(voiceState);
    const summaryRef = useRef(summary);
    const goalsRef = useRef(goals);

    useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);
    useEffect(() => { summaryRef.current = summary; }, [summary]);
    useEffect(() => { goalsRef.current = goals; }, [goals]);

    const getVoiceLang = (appLang) => {
        switch (appLang) {
            case 'te': return 'te-IN';
            case 'hi': return 'hi-IN';
            case 'en':
            default: return 'en-IN';
        }
    };

    const speakVoicePrompt = (langCode, key, ...args) => {
        const text = tVoice(langCode, key, ...args);
        setVoiceState(prev => ({ ...prev, promptMessage: text, transcript: '' }));
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getVoiceLang(langCode);
        window.speechSynthesis.speak(utterance);
    };

    const resetVoiceState = () => {
        setVoiceState({
            isActive: false,
            stage: 'idle',
            pendingAmount: null,
            pendingType: null,
            pendingDomainId: null,
            pendingGoalId: null,
            lastSpeechText: '',
            lastSpeechTimestamp: 0,
            promptMessage: '',
            transcript: '',
            activeLang: 'en'
        });
    };

    const processVoiceCommand = async (speechResult) => {
        const now = Date.now();
        const vState = voiceStateRef.current;
        const currentSummary = summaryRef.current;
        const currentGoals = goalsRef.current;

        // Duplicate prevention
        if (speechResult === vState.lastSpeechText && (now - vState.lastSpeechTimestamp < 3000)) {
            return;
        }

        let detectedLang = vState.activeLang || 'en';
        if (vState.stage === 'idle') {
            const teluguKeywords = ['ఆదాయం', 'ఖర్చు', 'డబ్బు', 'జోడించు'];
            const hindiKeywords = ['आय', 'खर्च', 'पैसा', 'जोड़ो'];
            let currentDetected = 'en';
            if (teluguKeywords.some(k => speechResult.includes(k))) currentDetected = 'te';
            else if (hindiKeywords.some(k => speechResult.includes(k))) currentDetected = 'hi';

            detectedLang = lang !== 'en' ? lang : currentDetected;
        } else {
            detectedLang = lang !== 'en' ? lang : vState.activeLang;
        }

        setVoiceState(prev => ({
            ...prev,
            transcript: speechResult,
            lastSpeechText: speechResult,
            lastSpeechTimestamp: now,
            activeLang: detectedLang
        }));

        let amount = vState.pendingAmount;
        let type = vState.pendingType;
        let domainId = vState.pendingDomainId;
        let goalId = vState.pendingGoalId;

        // Extract Amount if not already parsed
        if (!amount) {
            const amountMatch = speechResult.match(/\d+(\.\d+)?/);
            if (amountMatch) {
                amount = Number(amountMatch[0]);
            }
        }

        // Detect Type
        if (!type) {
            if (VOICE_KEYWORDS.income.some(k => speechResult.includes(k))) type = 'income';
            else if (VOICE_KEYWORDS.expense.some(k => speechResult.includes(k))) type = 'expense';
        }

        // Detect Category (Domain) or Goal
        if (!domainId && currentSummary && currentSummary.domain_breakdown) {
            const foundDomain = currentSummary.domain_breakdown.find(d => speechResult.includes(d.name.toLowerCase()) || speechResult === d.name);
            if (foundDomain) domainId = foundDomain.id;
        }

        // Logic based on current stage
        if (vState.stage === 'idle') {
            if (!amount || amount <= 0) {
                speakVoicePrompt(detectedLang, 'voice_prompt_amount');
                setVoiceState(prev => ({ ...prev, stage: 'askingAmount', pendingType: type, pendingDomainId: domainId }));
                return;
            }

            if (!type) {
                speakVoicePrompt(detectedLang, 'voice_strict_type');
                setVoiceState(prev => ({ ...prev, stage: 'askingType', pendingAmount: amount, pendingDomainId: domainId }));
                return;
            }

            if (type === 'expense' && !domainId) {
                speakVoicePrompt(detectedLang, 'voice_strict_domain');
                setVoiceState(prev => ({ ...prev, stage: 'askingCategory', pendingAmount: amount, pendingType: type }));
                return;
            }

            if (type === 'income' && currentGoals && currentGoals.length > 0) {
                speakVoicePrompt(detectedLang, 'voice_prompt_goal');
                setVoiceState(prev => ({ ...prev, stage: 'askingGoal', pendingAmount: amount, pendingType: type }));
                return;
            }

            // If we have everything, submit immediately!
            await submitVoiceTransaction(amount, type, domainId, null, speechResult);
            return;
        }

        if (vState.stage === 'askingAmount') {
            if (!amount || amount <= 0) {
                speakVoicePrompt(detectedLang, 'voice_prompt_valid_amount');
                return;
            }
            if (!type) {
                speakVoicePrompt(detectedLang, 'voice_strict_type');
                setVoiceState(prev => ({ ...prev, stage: 'askingType', pendingAmount: amount, pendingDomainId: domainId }));
                return;
            }
            if (type === 'expense' && !domainId) {
                speakVoicePrompt(detectedLang, 'voice_strict_domain');
                setVoiceState(prev => ({ ...prev, stage: 'askingCategory', pendingAmount: amount, pendingType: type }));
                return;
            }
            if (type === 'income' && currentGoals && currentGoals.length > 0) {
                speakVoicePrompt(detectedLang, 'voice_prompt_goal');
                setVoiceState(prev => ({ ...prev, stage: 'askingGoal', pendingAmount: amount, pendingType: type }));
                return;
            }
            await submitVoiceTransaction(amount, type, domainId, null, "Added via voice dialogue");
            return;
        }

        if (vState.stage === 'askingType') {
            if (!type) {
                speakVoicePrompt(detectedLang, 'voice_prompt_not_catch');
                return;
            }
            if (type === 'expense' && !domainId) {
                speakVoicePrompt(detectedLang, 'voice_strict_domain');
                setVoiceState(prev => ({ ...prev, stage: 'askingCategory', pendingAmount: amount, pendingType: type }));
                return;
            }
            if (type === 'income' && currentGoals && currentGoals.length > 0) {
                speakVoicePrompt(detectedLang, 'voice_prompt_goal');
                setVoiceState(prev => ({ ...prev, stage: 'askingGoal', pendingAmount: amount, pendingType: type }));
                return;
            }
            // If income without goals, just add to general balance
            await submitVoiceTransaction(amount, type, domainId, null, "Added via voice dialogue");
            return;
        }

        if (vState.stage === 'askingCategory') {
            if (!domainId) {
                speakVoicePrompt(detectedLang, 'voice_prompt_no_category');
                return;
            }
            await submitVoiceTransaction(amount, type, domainId, null, "Added via voice dialogue");
            return;
        }

        if (vState.stage === 'askingGoal') {
            if (speechResult.includes('general') || speechResult.includes('balance') || speechResult === 'general balance') {
                await submitVoiceTransaction(amount, type, null, null, "Added to general balance via voice");
                return;
            }
            const foundGoal = currentGoals.find(g => speechResult.includes(g.name.toLowerCase()) || speechResult === g.name);
            if (foundGoal) {
                await submitVoiceTransaction(amount, type, null, foundGoal.id, "Added to goal via voice");
                return;
            }
            speakVoicePrompt(detectedLang, 'voice_prompt_no_goal');
            return;
        }
    };

    const submitVoiceTransaction = async (finalAmount, finalType, finalDomainId, finalGoalId, description) => {
        try {
            if (finalType === 'expense' && finalDomainId) {
                speakBudgetFeedback(finalDomainId, finalAmount);
            } else {
                speakVoicePrompt(voiceStateRef.current.activeLang || lang, 'voice_strict_success', finalAmount);
            }

            const res = await fetch('http://localhost:5000/api/finance/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount: finalAmount, type: finalType, domain_id: finalDomainId, goal_id: finalGoalId, description, source: 'voice' })
            });

            if (res.ok) {
                toast.success(t('voice_success'));
                fetchData();
            } else {
                toast.error(t('error_network'));
            }
        } catch (err) {
            toast.error(t('error_network'));
        } finally {
            resetVoiceState();
        }
    };

    const speakBudgetFeedback = (domainId, addedAmount) => {
        if (!summary || !summary.domain_breakdown || !domainId) return;
        const domain = summary.domain_breakdown.find(d => d.id === domainId);
        if (!domain || domain.expected_amount <= 0) return;

        const newSpent = domain.spent_amount + Number(addedAmount);
        const usagePercentage = Math.round((newSpent / domain.expected_amount) * 100);

        let detectedLang = voiceStateRef.current?.activeLang || lang;

        const part1 = tVoice(detectedLang, 'voice_strict_monthly_budget', domain.expected_amount.toString());
        const part2 = tVoice(detectedLang, 'voice_strict_budget_used', usagePercentage.toString());
        const message = `${part1} ${part2}`;

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = getVoiceLang(detectedLang);
        window.speechSynthesis.speak(utterance);
    };

    const handleSmsParse = async (text) => {
        setSmsText(text);
        if (!text) return;

        const lowerText = text.toLowerCase();

        // 1. Strict filtering: Ensure it is actually a financial message
        const isIncome = /(credit|receive|income|salary|refund|credited|received)/i.test(lowerText);
        const isExpense = /(debit|withdraw|spent|payment|pay|debited|withdrawn)/i.test(lowerText);

        if (!isIncome && !isExpense) {
            // Not a recognized financial transaction SMS
            return;
        }

        // 2. Extract amount: looks for Rs, INR, ₹, etc., and a number.
        const amountMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)/i) ||
            lowerText.match(/([\d,]+(?:\.\d+)?)\s*(?:rs|inr)/i) ||
            text.match(/(?:debited|credited|withdrawn|spent|received|payment|transaction|rs)(?:\s+by|\s+of|\s+for)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)/i);

        let parsedAmtStr = null;
        if (amountMatch) {
            parsedAmtStr = amountMatch[1] || amountMatch[2];
        } else {
            // fallback generic number if it contains debit/credit etc
            const fallback = text.match(/[\d,]+(?:\.\d+)?/);
            if (fallback) parsedAmtStr = fallback[0];
        }

        if (!parsedAmtStr) {
            toast.warn("Detected a financial SMS, but couldn't find the exact amount.");
            return; // Needs an amount to proceed
        }

        const parsedAmtNumber = Number(parsedAmtStr.replace(/,/g, ''));
        if (parsedAmtNumber <= 0) return;

        // 3. Extract Type
        const parsedType = isIncome ? 'income' : 'expense';

        // 4. Extract Domain
        let parsedDomainId = '';
        if (summary && summary.domain_breakdown) {
            const foundDomain = summary.domain_breakdown.find(d => lowerText.includes(d.name.toLowerCase()));
            if (foundDomain) {
                parsedDomainId = foundDomain.id;
            }
        }

        const parsedDescription = text.substring(0, 100); // limit description string size

        // 5. Update UI visually for the user
        setAmount(parsedAmtNumber);
        setType(parsedType);
        setDomainId(parsedDomainId);
        setDescription(parsedDescription);

        // 6. Auto-Submit the transaction to the backend
        try {
            if (parsedType === 'expense' && parsedDomainId) {
                speakBudgetFeedback(parsedDomainId, parsedAmtNumber);
            }

            const res = await fetch('http://localhost:5000/api/finance/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount: parsedAmtNumber, type: parsedType, domain_id: parsedDomainId || null, description: parsedDescription, source: 'sms' })
            });

            if (res.ok) {
                setAmount(''); setDescription(''); setSmsText('');
                toast.success(t('sms_success'));
                fetchData();
            } else {
                toast.error(t('error_network'));
            }
        } catch (err) {
            toast.error(t('error_network'));
        }
    };

    const handleVoiceRecordToggle = () => {
        if (voiceState.isActive) {
            resetVoiceState();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Voice recognition is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setVoiceState(prev => ({ ...prev, isActive: true, promptMessage: t('voice_listening') }));
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript.toLowerCase();
            processVoiceCommand(speechResult);
        };

        recognition.onerror = (event) => {
            if (event.error !== 'no-speech') {
                toast.error(`Voice error: ${event.error}`);
            }
            setIsListening(false);
            if (voiceStateRef.current.stage === 'idle') resetVoiceState();
        };

        recognition.onend = () => {
            setIsListening(false);
            // If we are in the middle of a dialogue stage, we should immediately restart listening 
            // so the user can answer the prompt without clicking mic again.
            if (voiceStateRef.current.stage !== 'idle' && voiceStateRef.current.isActive) {
                try {
                    recognition.start();
                } catch (e) { }
            }
        };

        recognition.start();
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [sumRes, transRes, goalsRes, voicePlanRes] = await Promise.all([
                fetch('http://localhost:5000/api/finance/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://localhost:5000/api/finance/transactions', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://localhost:5000/api/goals', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://localhost:5000/api/finance/voice-plan/latest', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (sumRes.ok) setSummary(await sumRes.json());
            if (transRes.ok) setTransactions(await transRes.json());
            if (goalsRes.ok) setGoals(await goalsRes.json());
            if (voicePlanRes.ok) setLatestVoicePlan(await voicePlanRes.json());
        } catch (err) {
            toast.error('Failed to fetch dashboard data');
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();

        if (type === 'expense' && !domainId) {
            setManualCategoryError(true);
            return;
        }

        try {
            if (type === 'expense' && domainId) {
                speakBudgetFeedback(domainId, amount);
            }

            const res = await fetch('http://localhost:5000/api/finance/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount: Number(amount), type, domain_id: domainId || null, description, source: 'manual' })
            });
            if (res.ok) {
                setAmount(''); setDescription(''); setSmsText('');
                toast.success(t('transaction_saved'));
                fetchData();
                window.dispatchEvent(new Event('transaction-updated'));
            } else {
                toast.error(t('error_network'));
            }
        } catch (err) {
            toast.error(t('error_network'));
        }
    };

    const handleCreateDomain = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/finance/domains', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: newDomainName, expected_amount: Number(newDomainExpected) })
            });
            if (res.ok) {
                setNewDomainName(''); setNewDomainExpected('');
                toast.success(t('domain_saved'));
                fetchData();
            } else {
                toast.error(t('error_network'));
            }
        } catch (err) {
            toast.error(t('error_network'));
        }
    };

    if (!summary) return <div className="flex justify-center items-center h-[60vh] text-xl font-medium text-blue-600 dark:text-blue-400">{t('loading')}</div>;

    const pieData = [
        { name: t('income'), value: summary.total_income, color: '#10b981' },
        { name: t('expense'), value: summary.total_expense, color: '#ef4444' }
    ].filter(d => d.value > 0);

    const barData = summary.domain_breakdown.map(d => ({
        name: d.name,
        Expected: d.expected_amount,
        Spent: d.spent_amount
    }));

    const today = new Date().toISOString().split('T')[0];
    const todaysTransactions = transactions.filter(t => t.date.startsWith(today));
    const todayIncome = todaysTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const todayExpense = todaysTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netDaily = todayIncome - todayExpense;

    let dailyColor = 'bg-emerald-500 text-white';
    let trackerMessage = netDaily < 0 ? t('below_goal') : netDaily > 50 ? t('great_savings') : t('met_goal');

    if (latestVoicePlan) {
        const dailyAllowed = latestVoicePlan.generatedPlan.dailyAllowed;
        if (todayExpense > dailyAllowed) {
            dailyColor = 'bg-red-500 text-white';
            trackerMessage = 'Over Budget Limit';
        } else if (todayExpense >= dailyAllowed * 0.8) {
            dailyColor = 'bg-emerald-400 text-white'; // Light Green
            trackerMessage = 'Near Budget Limit';
        } else {
            dailyColor = 'bg-emerald-600 text-white'; // Dark Green
            trackerMessage = 'Under Spending Limit';
        }
    } else {
        if (netDaily < 0) dailyColor = 'bg-red-500 text-white';
        else if (netDaily > 50) dailyColor = 'bg-emerald-700 text-white';
    }

    // 📈 Goal Prediction Logic
    let primaryGoal = null;
    let predictionData = null;

    if (goals && goals.length > 0 && summary) {
        // Just take the first goal as the primary one for the dashboard forecast
        primaryGoal = goals[0];

        // Ensure we calculate from the actual Goal document createdAt in backend, fallback to today
        const goalStartDate = primaryGoal.createdAt ? new Date(primaryGoal.createdAt) : new Date();
        const currentDate = new Date();

        // elapsedTime
        let elapsedDays = (currentDate - goalStartDate) / (1000 * 60 * 60 * 24);
        elapsedDays = Math.max(elapsedDays, 1); // Avoid division by zero if created today
        let elapsedMonths = elapsedDays / 30; // approx

        // User's current savings (total income - total expense)
        const currentTotalSaved = summary.current_balance;

        // savings rate
        let actualMonthlySavings = currentTotalSaved / elapsedMonths;
        // If they are spending more than making, savings rate is negative/zero
        if (actualMonthlySavings <= 0) actualMonthlySavings = 0.01;

        const estimatedMonthsToGoal = parseFloat((primaryGoal.target_amount / actualMonthlySavings).toFixed(1));
        const goalDeadlineMonths = primaryGoal.months;

        const expectedSavingsAtDeadline = actualMonthlySavings * goalDeadlineMonths;
        const shortfallAmount = primaryGoal.target_amount - expectedSavingsAtDeadline;

        // Is on track?
        const onTrack = estimatedMonthsToGoal <= goalDeadlineMonths;

        predictionData = {
            onTrack,
            estimatedMonthsToGoal,
            shortfallAmount: shortfallAmount > 0 ? shortfallAmount.toFixed(0) : 0,
            goalName: primaryGoal.name
        };
    }

    return (
        <div className="space-y-8 animate-fade-in relative">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard')}</h2>
                    <SmsSimulator onComplete={fetchData} domains={summary?.domain_breakdown} />
                </div>
                {predictionData && (
                    <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 shadow-sm ${predictionData.onTrack
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800'
                        : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'
                        }`}>
                        <div className={`p-2 rounded-full ${predictionData.onTrack ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800/50 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-800/50 dark:text-red-400'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${predictionData.onTrack ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                Goal Forecast: {predictionData.goalName}
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {t('on_track_months', predictionData.estimatedMonthsToGoal)}
                                {!predictionData.onTrack && (
                                    <span className="block text-red-600 dark:text-red-400 mt-1">
                                        {t('miss_goal_by', predictionData.shortfallAmount)}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card text-center flex flex-col justify-center items-center">
                    <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-2">{t('current_balance')}</h3>
                    <p className={`text-4xl font-black ${summary.current_balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${summary.current_balance.toFixed(2)}
                    </p>
                </div>

                <div className="card text-center flex flex-col justify-center items-center">
                    <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-2">
                        {latestVoicePlan ? 'Daily Budget Used' : t('net_daily')}
                    </h3>
                    <p className={`text-4xl font-black ${latestVoicePlan && todayExpense > latestVoicePlan.generatedPlan.dailyAllowed ? 'text-red-500' : 'text-gray-900 dark:text-white'} mb-3`}>
                        ${latestVoicePlan ? todayExpense.toFixed(2) : netDaily.toFixed(2)}
                        {latestVoicePlan && <span className="text-lg text-gray-400 font-medium"> / {latestVoicePlan.generatedPlan.dailyAllowed}</span>}
                    </p>
                    <span className={`px-4 py-1 rounded-full text-sm font-semibold shadow-sm ${dailyColor}`}>
                        {trackerMessage}
                    </span>
                </div>

                <div className="card relative overflow-hidden transition-all duration-300">
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            {voiceState.isActive ? 'Conversational AI' : t('add_transaction')}
                        </h3>
                        <button
                            type="button"
                            onClick={handleVoiceRecordToggle}
                            className={`p-2.5 rounded-full transition-all flex items-center justify-center shadow-sm ${voiceState.isActive ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800' : 'bg-white dark:bg-gray-800 text-blue-600 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
                            title="Voice Financial Assistant"
                        >
                            {voiceState.isActive ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                    </div>

                    {voiceState.isActive ? (
                        <div className="flex flex-col items-center justify-center py-6 min-h-[250px] animate-fade-in relative z-10">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                                    <Mic size={28} />
                                </div>
                            </div>

                            <p className="text-lg font-bold text-gray-800 dark:text-gray-100 text-center mb-3 px-4 transition-all">
                                {voiceState.promptMessage || t('loading')}
                            </p>

                            {voiceState.transcript && (
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 italic text-center px-4 bg-gray-50 dark:bg-gray-800/50 py-2.5 rounded-xl w-full border border-gray-100 dark:border-gray-700">
                                    "{voiceState.transcript}"
                                </p>
                            )}

                            {/* Conversational Option Buttons */}
                            {voiceState.stage === 'askingType' && (
                                <div className="flex gap-3 mt-6 w-full animate-fade-in">
                                    <button onClick={() => processVoiceCommand('income')} className="flex-1 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 hover:bg-emerald-100 hover:shadow-sm transition-all dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400">Income</button>
                                    <button onClick={() => processVoiceCommand('expense')} className="flex-1 py-3 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200 hover:bg-red-100 hover:shadow-sm transition-all dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400">Expense</button>
                                </div>
                            )}

                            {voiceState.stage === 'askingCategory' && (
                                <div className="flex flex-wrap justify-center gap-2 mt-6 animate-fade-in">
                                    {summary.domain_breakdown.map(d => (
                                        <button key={d.id} onClick={() => processVoiceCommand(d.name)} className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold shadow-sm hover:shadow-md hover:border-blue-300 hover:text-blue-600 transition-all border border-gray-200 dark:border-gray-700">
                                            {d.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {voiceState.stage === 'askingGoal' && (
                                <div className="flex flex-col items-center gap-2 mt-6 animate-fade-in w-full max-w-sm">
                                    <button onClick={() => processVoiceCommand('general balance')} className="w-full px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold shadow-sm hover:shadow-md hover:border-emerald-300 border border-emerald-200 transition-all">
                                        {t('general_balance_button')}
                                    </button>
                                    {goals.map(g => (
                                        <button key={g.id} onClick={() => processVoiceCommand(g.name)} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold shadow-sm hover:shadow-md hover:border-blue-300 hover:text-blue-600 transition-all border border-gray-200 dark:border-gray-700">
                                            {t('goals')}: {g.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-blue-50/50 to-transparent dark:from-blue-900/10 pointer-events-none rounded-2xl" />
                        </div>
                    ) : (
                        <form onSubmit={handleAddTransaction} className="space-y-4 relative z-10 animate-fade-in">
                            <textarea
                                placeholder={t('sms_placeholder')}
                                value={smsText}
                                onChange={e => handleSmsParse(e.target.value)}
                                className="form-input w-full text-sm min-h-[60px] resize-none border-dashed border-2 bg-gray-50 dark:bg-gray-800/50 focus:border-blue-400"
                            />
                            <div className="flex gap-4">
                                <select
                                    value={type}
                                    onChange={e => setType(e.target.value)}
                                    className="form-input flex-1 font-medium bg-white dark:bg-gray-800"
                                >
                                    <option value="income">{t('income')}</option>
                                    <option value="expense">{t('expense')}</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder={t('amount')}
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                    className="form-input w-28 font-bold text-gray-900 dark:text-white"
                                />
                            </div>
                            {type === 'expense' && (
                                <div>
                                    <select
                                        value={domainId}
                                        onChange={e => {
                                            setDomainId(e.target.value);
                                            if (manualCategoryError) setManualCategoryError(false);
                                        }}
                                        className={`form-input w-full bg-white dark:bg-gray-800 transition-all ${manualCategoryError ? 'border-red-500 focus:border-red-500' : ''}`}
                                    >
                                        <option value="">{t('select_category')}</option>
                                        {summary.domain_breakdown.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                    {manualCategoryError && (
                                        <p className="text-red-500 text-xs mt-1 font-medium animate-fade-in">{t('error_required')}</p>
                                    )}
                                </div>
                            )}
                            <input
                                type="text"
                                placeholder={t('description')}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="form-input w-full bg-white dark:bg-gray-800"
                            />
                            <button type="submit" className="btn btn-primary w-full shadow-sm py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">{t('submit')}</button>
                        </form>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Add Domain</h3>
                    <form onSubmit={handleCreateDomain} className="space-y-4">
                        <div className="form-group">
                            <input type="text" className="form-input" placeholder="Domain Name" value={newDomainName} onChange={e => setNewDomainName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <input type="number" className="form-input" placeholder="Expected Spending" value={newDomainExpected} onChange={e => setNewDomainExpected(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn btn-secondary w-full">Add Domain</button>
                    </form>
                </div>

                <div className="card flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Overview</h3>
                    <div className="flex-1 min-h-[250px] w-full">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `$${value}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">{t('no_data_available')}</div>
                        )}
                    </div>
                </div>

                <div className="card flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('domains')}</h3>
                    <div className="flex-1 min-h-[250px] w-full">
                        {barData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData}>
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(value) => `$${value}`} />
                                    <Legend />
                                    <Bar dataKey="Expected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">{t('no_data')}</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card border-0 bg-transparent shadow-none !p-0 -mx-2 sm:mx-0">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-5 px-2 sm:px-0">Domain Budgets & Alerts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 px-2 sm:px-0">
                    {summary.domain_breakdown.length > 0 ? (
                        summary.domain_breakdown.map(d => {
                            const percentage = d.expected_amount > 0 ? (d.spent_amount / d.expected_amount) * 100 : 0;
                            let colorClass = "bg-blue-500";
                            let warningMsg = null;
                            let warningColor = "";

                            if (percentage > 100) {
                                colorClass = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
                                warningMsg = t('over_budget');
                                warningColor = "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50 border border-red-200 dark:border-red-800";
                            } else if (percentage === 100) {
                                colorClass = "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]";
                                warningMsg = t('full_budget_used');
                                warningColor = "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800";
                            } else if (percentage > 50) {
                                colorClass = "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
                                warningMsg = t('approaching_limit');
                                warningColor = "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-800";
                            } else {
                                colorClass = "bg-emerald-500";
                            }

                            return (
                                <div key={d.id} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">{d.name}</span>
                                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg">
                                            ${d.spent_amount} / ${d.expected_amount}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3.5 mb-4 overflow-hidden relative">
                                        <div className={`h-3.5 rounded-full ${colorClass} transition-all duration-1000 ease-out relative`} style={{ width: `${Math.min(percentage, 100)}%` }}>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                                        </div>
                                    </div>
                                    <div className="min-h-[32px] flex items-center">
                                        {warningMsg ? (
                                            <span className={`text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-full ${warningColor}`}>
                                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                                {warningMsg}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-full text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50">
                                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                                On track with spending
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-gray-500 col-span-full text-center py-8 font-medium bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            No domain budgets established yet. Create one in the form above!
                        </div>
                    )}
                </div>
            </div>

            <div className="card overflow-hidden !p-0 shadow-sm">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('recent_transactions')}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Domain</th>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {transactions.slice(0, 5).map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(t.date).toLocaleDateString()}</td>
                                    <td className={`px-6 py-4 font-medium capitalize ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {t.type}
                                    </td>
                                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{t.domain_name || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 dark:text-gray-400 truncate max-w-xs">{t.description || '-'}</span>
                                            {t.source === 'sms' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                                                    Detected from SMS
                                                </span>
                                            )}
                                            {t.source === 'voice' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                                                    Voice AI
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">${t.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <VoiceBudgetModal
                isOpen={isVoiceBudgetOpen}
                onClose={() => setIsVoiceBudgetOpen(false)}
                onPlanSaved={() => {
                    setIsVoiceBudgetOpen(false);
                    fetchData();
                }}
            />
        </div>
    );
};

export default Dashboard;
