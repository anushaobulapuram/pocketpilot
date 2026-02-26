import { useState, useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const { t, lang, setLang } = useContext(LanguageContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) {
            toast.error(t('Passwords do not match'));
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(t('Account created successfully'));
                navigate('/login');
            } else {
                toast.error(data.error || t('Registration failed'));
            }
        } catch (err) {
            toast.error(t('error_network'));
        }
    };

    return (
        <div className="flex justify-center items-center py-10">
            <div className="card w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('signup')}</h2>
                    <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value)}
                        className="form-input w-auto py-1 text-sm font-medium"
                    >
                        <option value="en">English</option>
                        <option value="te">తెలుగు</option>
                        <option value="hi">हिंदी</option>
                    </select>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="form-group">
                        <label>{t('username')}</label>
                        <input
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('email')}</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('password')}</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('re_enter_password')}</label>
                        <input
                            type="password"
                            className="form-input"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-full mt-6">{t('signup')}</button>
                </form>

                <div className="text-center mt-6">
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('Already have an account?')}
                        <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                            {t('login')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
