import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // טעינת הtheme מ-localStorage בזמן אתחול
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('horizon-theme');
      return savedTheme || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    // שמירת הtheme ב-localStorage
    localStorage.setItem('horizon-theme', theme);
    
    // עדכון ה-data-theme attribute על ה-html element
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;