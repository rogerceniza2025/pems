import { createSignal, createContext, useContext, createEffect, onMount } from "solid-js";

const ThemeContext = createContext();

export function ThemeProvider(props) {
  const [theme, setTheme] = createSignal("light"); // 'light' | 'dark'

  const apply = (t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
  };

  onMount(() => {
    try {
      const saved = localStorage.getItem("pems:theme");
      const initialTheme = saved || "light";
      setTheme(initialTheme);
      apply(initialTheme);
    } catch (e) {
      setTheme("light");
      apply("light");
    }
  });

  createEffect(() => {
    const currentTheme = theme();
    apply(currentTheme);
    try {
      localStorage.setItem("pems:theme", currentTheme);
    } catch (e) {}
  });

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}