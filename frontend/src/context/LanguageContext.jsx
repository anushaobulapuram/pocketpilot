import { createContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import te from '../locales/te.json';
import hi from '../locales/hi.json';

export const LanguageContext = createContext();

const translations = {
    en,
    te,
    hi
};

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

    useEffect(() => {
        localStorage.setItem('lang', lang);
    }, [lang]);

    // t(key, arg0, arg1...) supports dynamic string interpolation {0}, {1}
    const t = (key, ...args) => {
        let text = translations[lang]?.[key] || translations['en']?.[key] || key;

        if (args.length > 0) {
            args.forEach((arg, index) => {
                text = text.replace(new RegExp(`\\{${index}\\}`, 'g'), arg);
            });
        }
        return text;
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
