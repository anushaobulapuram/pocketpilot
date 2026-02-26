import { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { ThemeContext } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import { User, Lock, Sliders, Camera as CameraIcon, Image as ImageIcon, X } from 'lucide-react';

const Settings = () => {
    const { user, token, setUser } = useContext(AuthContext);
    const { t, lang, setLang } = useContext(LanguageContext);
    const { theme, setTheme } = useContext(ThemeContext);

    const [email, setEmail] = useState(user.email || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Photo Upload States
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const handleAccountSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                toast.success('Account specifics updated successfully');
                setUser({ ...user, email });
            } else toast.error('Error updating account specifics');
        } catch (err) { toast.error('Network error updating settings'); }
    };

    const handleSecuritySubmit = async (e) => {
        e.preventDefault();
        if (!password) return toast.info('Enter a new password');
        try {
            const res = await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ password })
            });
            if (res.ok) {
                toast.success('Password updated successfully');
                setPassword('');
            } else toast.error('Error updating password');
        } catch (err) { toast.error('Network error updating security'); }
    };

    const handleThemeChange = async (e) => {
        const newTheme = e.target.value;
        setTheme(newTheme);
        try {
            await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ theme: newTheme })
            });
            toast.success('Theme updated');
        } catch (err) { toast.error('Failed to sync theme'); }
    };

    const handleLangChange = async (e) => {
        const newLang = e.target.value;
        setLang(newLang);
        try {
            await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ language: newLang })
            });
            toast.success('Language updated');
        } catch (err) { toast.error('Failed to sync language'); }
    };

    // --- Photo Upload Logic ---
    const closePhotoModal = () => {
        setIsPhotoModalOpen(false);
        stopCamera();
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraActive(true);
        } catch (err) {
            toast.error('Unable to access camera.');
            console.error('Camera error:', err);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8);
            uploadPhoto(base64Image);
            closePhotoModal();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                return toast.error('Please upload a valid image file');
            }
            if (file.size > 5 * 1024 * 1024) {
                return toast.error('File size must be less than 5MB');
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                uploadPhoto(reader.result);
                closePhotoModal();
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadPhoto = async (base64String) => {
        try {
            const res = await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ profilePhoto: base64String })
            });

            if (res.ok) {
                toast.success('Profile photo updated');
                setUser({ ...user, profilePhoto: base64String });
            } else {
                toast.error('Failed to upload photo');
            }
        } catch (err) {
            toast.error('Network error during upload');
        }
    };

    // Clean up camera on unmount
    useEffect(() => {
        return () => stopCamera();
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-8 animate-fade-in space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">{t('settings')}</h1>

            {/* Account Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                    <User className="text-blue-500" size={20} />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('account_information')}</h2>
                </div>
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Profile Photo Interactive Block */}
                        <div className="flex flex-col items-center space-y-4">
                            <div
                                onClick={() => setIsPhotoModalOpen(true)}
                                className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center relative group cursor-pointer border-2 border-dashed border-blue-300 dark:border-blue-700 overflow-hidden"
                            >
                                {user.profilePhoto ? (
                                    <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-blue-600 dark:text-blue-400 group-hover:opacity-0 transition-opacity">
                                        {user.username.charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CameraIcon className="text-white" size={24} />
                                </div>
                            </div>
                            <span
                                onClick={() => setIsPhotoModalOpen(true)}
                                className="text-sm text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline"
                            >
                                {t('update_photo')}
                            </span>
                            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Verified Account
                            </div>
                        </div>

                        {/* Account Details */}
                        <form onSubmit={handleAccountSubmit} className="flex-1 space-y-4">
                            <div className="form-group">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username <span className="text-gray-400 font-normal">(Non-editable)</span></label>
                                <input type="text" className="form-input bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed" value={user.username} disabled />
                            </div>
                            <div className="form-group">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('email')}</label>
                                <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" className="btn btn-primary px-6">{t('save_changes')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                    <Lock className="text-red-500" size={20} />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('security')}</h2>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSecuritySubmit} className="max-w-md space-y-4">
                        <div className="form-group">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="form-input pr-10"
                                    value={password}
                                    placeholder="Enter to change password"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <button type="button" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">{t('forgot_password')}</button>
                            <button type="submit" className="btn btn-secondary px-6 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-900/50 dark:hover:bg-red-900/30">{t('change_password')}</button>
                        </div>
                    </form>
                </div>
            </section>

            {/* Preferences Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                    <Sliders className="text-emerald-500" size={20} />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('preferences')}</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="form-group">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('theme')}</label>
                        <select value={theme} onChange={handleThemeChange} className="form-input mt-2 cursor-pointer bg-white dark:bg-gray-700">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">Choose your preferred visual mode across the application.</p>
                    </div>

                    <div className="form-group">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('language')}</label>
                        <select value={lang} onChange={handleLangChange} className="form-input mt-2 cursor-pointer bg-white dark:bg-gray-700">
                            <option value="en">English</option>
                            <option value="te">తెలుగు</option>
                            <option value="hi">हिंदी</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">Select the language used throughout the interface.</p>
                    </div>
                </div>
            </section>

            {/* Photo Upload Modal */}
            {isPhotoModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('photo_upload_title')}</h3>
                            <button onClick={closePhotoModal} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            {!isCameraActive ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-blue-500 transition-colors"
                                    >
                                        <ImageIcon className="text-blue-500" size={32} />
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('photo_upload_gallery')}</span>
                                    </button>
                                    <button
                                        onClick={openCamera}
                                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-green-500 transition-colors"
                                    >
                                        <CameraIcon className="text-green-500" size={32} />
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('photo_upload_camera')}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center space-y-4">
                                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative">
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex gap-4 w-full">
                                        <button onClick={stopCamera} className="flex-1 btn btn-secondary text-gray-600 bg-gray-100 hover:bg-gray-200 border-transparent text-sm py-2">{t('cancel')}</button>
                                        <button onClick={capturePhoto} className="flex-1 btn btn-primary flex items-center justify-center gap-2 text-sm py-2"><CameraIcon size={16} /> {t('capture')}</button>
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
