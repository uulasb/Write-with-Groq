import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-lg 
        text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-colors
      `}
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5">
        <motion.div
          initial={false}
          animate={{
            opacity: isDark ? 0 : 1,
            scale: isDark ? 0.5 : 1,
            rotate: isDark ? -90 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          <Sun size={20} />
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            opacity: isDark ? 1 : 0,
            scale: isDark ? 1 : 0.5,
            rotate: isDark ? 0 : 90,
          }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          <Moon size={20} />
        </motion.div>
      </div>
    </button>
  );
}
