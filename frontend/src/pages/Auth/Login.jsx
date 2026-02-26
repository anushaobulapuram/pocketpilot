import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const { t, lang, setLang } = useContext(LanguageContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                login(data.token, data.user);
                toast.success(t('Logged in successfully!'));
                navigate('/');
            } else {
                setError(data.error || t('Invalid credentials'));
                toast.error(data.error || t('Invalid credentials'));
            }
        } catch (err) {
            setError(t('Login failed'));
            toast.error(t('Login failed'));
        }
    };

    return (
        <div className="flex justify-center items-center py-20">
            <div className="card w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('login')}</h2>
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
                        <label>{t('password')}</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-full mt-6">{t('login')}</button>
                </form>

                <div className="text-center mt-6">
                    <p className="text-gray-600 dark:text-gray-400">
                        {t("Don't have an account?")}
                        <Link to="/signup" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                            {t('signup')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
