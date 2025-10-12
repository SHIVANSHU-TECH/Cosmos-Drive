'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define theme types
export type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple';
export type ThemeConfig = {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
};

// Define available themes
export const themes: Record<Theme, ThemeConfig> = {
  light: {
    name: 'Light',
    primary: 'bg-blue-600',
    secondary: 'bg-blue-500',
    background: 'bg-gray-50',
    cardBackground: 'bg-white',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-100',
  },
  dark: {
    name: 'Dark',
    primary: 'bg-gray-800',
    secondary: 'bg-gray-700',
    background: 'bg-gray-900',
    cardBackground: 'bg-gray-800',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    border: 'border-gray-700',
    hover: 'hover:bg-gray-700',
  },
  blue: {
    name: 'Ocean Blue',
    primary: 'bg-blue-500',
    secondary: 'bg-blue-400',
    background: 'bg-blue-50',
    cardBackground: 'bg-white',
    text: 'text-blue-900',
    textSecondary: 'text-blue-700',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-100',
  },
  green: {
    name: 'Forest Green',
    primary: 'bg-green-600',
    secondary: 'bg-green-500',
    background: 'bg-green-50',
    cardBackground: 'bg-white',
    text: 'text-green-900',
    textSecondary: 'text-green-700',
    border: 'border-green-200',
    hover: 'hover:bg-green-100',
  },
  purple: {
    name: 'Royal Purple',
    primary: 'bg-purple-600',
    secondary: 'bg-purple-500',
    background: 'bg-purple-50',
    cardBackground: 'bg-white',
    text: 'text-purple-900',
    textSecondary: 'text-purple-700',
    border: 'border-purple-200',
    hover: 'hover:bg-purple-100',
  },
};

// Create context
interface ThemeContextType {
  theme: Theme;
  themeConfig: ThemeConfig;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  // Load theme from localStorage on initial render
  useEffect(() => {
    const savedTheme = localStorage.getItem('driveEmbedTheme') as Theme;
    if (savedTheme && themes[savedTheme]) {
      setTheme(savedTheme);
    }
  }, []);

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('driveEmbedTheme', theme);
  }, [theme]);

  const themeConfig = themes[theme];

  return (
    <ThemeContext.Provider value={{ theme, themeConfig, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use theme
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}