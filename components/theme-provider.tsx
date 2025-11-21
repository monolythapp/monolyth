'use client';

import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'monolyth-theme';

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'light',
  enableSystem = false,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Apply theme to document
  const applyTheme = React.useCallback((nextTheme: Theme) => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    if (disableTransitionOnChange) {
      const css = document.createElement('style');
      css.appendChild(
        document.createTextNode(
          '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'
        )
      );
      document.head.appendChild(css);
      
      if (nextTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      // Force reflow
      void root.offsetHeight;
      
      document.head.removeChild(css);
    } else {
      if (nextTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [disableTransitionOnChange]);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    setMounted(true);
    
    let initialTheme: Theme = defaultTheme;
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      
      if (stored === 'light' || stored === 'dark') {
        initialTheme = stored;
      } else if (enableSystem) {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        initialTheme = systemPrefersDark ? 'dark' : 'light';
      }
      
      setThemeState(initialTheme);
      applyTheme(initialTheme);
    }
  }, [defaultTheme, enableSystem, applyTheme]);

  // Update theme state and apply changes
  const setTheme = React.useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      applyTheme(nextTheme);
    }
  }, [applyTheme]);

  // Apply theme when it changes
  useEffect(() => {
    if (mounted) {
      applyTheme(theme);
    }
  }, [theme, mounted, applyTheme]);

  // Always provide the context, even during SSR/initial render
  // This prevents "useTheme must be used within ThemeProvider" errors
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
