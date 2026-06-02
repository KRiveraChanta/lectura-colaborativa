import React, { createContext, useContext, useState, useEffect } from 'react';
import { PrimeReactContext } from 'primereact/api';

interface ThemeContextType {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { changeTheme } = useContext(PrimeReactContext);
    
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    useEffect(() => {
        const currentTheme = isDarkMode ? 'bootstrap4-light-blue' : 'bootstrap4-dark-blue';
        const newTheme = isDarkMode ? 'bootstrap4-dark-blue' : 'bootstrap4-light-blue';
        
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-bs-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-bs-theme', 'light');
            localStorage.setItem('theme', 'light');
        }

        if (changeTheme) {
            changeTheme(currentTheme, newTheme, 'theme-link');
        }
    }, [isDarkMode, changeTheme]);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
