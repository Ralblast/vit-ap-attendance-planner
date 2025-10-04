import React, { createContext, useState, useContext, useMemo } from 'react';

// Create the context object
const ThemeContext = createContext();

// Create a custom hook for easy access to the context
export const useTheme = () => useContext(ThemeContext);

// Create the Provider component that will wrap our app
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  // useMemo ensures the context value object is not recreated on every render
  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};