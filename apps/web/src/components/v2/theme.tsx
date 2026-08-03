"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * FRONTEND-V2 theme controller. The (v2) layout inlines a pre-paint script
 * that stamps `v2-root` + data-v2-theme on <html> (so tokens apply before
 * hydration and Radix portals inherit); this provider keeps React state in
 * sync and removes the classes when the user navigates out of /v2.
 */

export type V2Theme = "light" | "dark";

const STORAGE_KEY = "v2-theme";

const ThemeContext = createContext<{ theme: V2Theme; setTheme: (t: V2Theme) => void }>({
  theme: "light",
  setTheme: () => undefined,
});

/** Runs before paint via dangerouslySetInnerHTML in the (v2) layout. */
export const V2_THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}")==="dark"?"dark":"light";var d=document.documentElement;d.classList.add("v2-root");d.setAttribute("data-v2-theme",t);}catch(e){}})();`;

export function V2ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<V2Theme>("light");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("v2-root");
    const stored = window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
    root.setAttribute("data-v2-theme", stored);
    setThemeState(stored);
    return () => {
      root.classList.remove("v2-root");
      root.removeAttribute("data-v2-theme");
    };
  }, []);

  const setTheme = useCallback((t: V2Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-v2-theme", t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // storage unavailable — theme stays session-local
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useV2Theme() {
  return useContext(ThemeContext);
}

/** Minimal text toggle — LIGHT / DARK, no icons needed. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useV2Theme();
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`type-mono cursor-pointer text-ink-muted transition-colors hover:text-ink ${className ?? ""}`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "LIGHT" : "DARK"}
    </button>
  );
}
