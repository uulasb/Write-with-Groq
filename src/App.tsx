import React, { useState } from 'react';
import { Editor } from './components/Editor';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import { ModelSelector } from './components/ModelSelector';
import { Save, Undo, Redo, Github } from 'lucide-react';
import { useEditorStore } from './store';
import waiLogo from '../Wai.svg';
import { motion } from 'framer-motion';

function App() {
  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);
  const [showUndoTooltip, setShowUndoTooltip] = useState(false);
  const [showRedoTooltip, setShowRedoTooltip] = useState(false);
  
  const { 
    currentFile, 
    saveCurrentFile, 
    undo, 
    redo,
    canUndo,
    canRedo,
    hasUnsavedChanges
  } = useEditorStore();

  const handleSave = () => {
    saveCurrentFile();
    setShowSaveTooltip(true);
    setTimeout(() => setShowSaveTooltip(false), 1000);
  };

  const handleUndo = () => {
    undo();
    setShowUndoTooltip(true);
    setTimeout(() => setShowUndoTooltip(false), 1000);
  };

  const handleRedo = () => {
    redo();
    setShowRedoTooltip(true);
    setTimeout(() => setShowRedoTooltip(false), 1000);
  };

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {/* Header */}
        <header className="h-14 border-b border-gray-200 dark:border-gray-700 px-2 sm:px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <img src={waiLogo} alt="WAI Logo" className="h-5 w-5 sm:h-6 sm:w-6" />
              <h1 className="text-lg sm:text-xl font-semibold">AI Writer</h1>
            </div>
            <div className="hidden sm:block">
              <ModelSelector />
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Editor Controls */}
            <div className="flex items-center mr-2 sm:mr-4 space-x-0.5 sm:space-x-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUndo}
                disabled={!canUndo()}
                className={`p-1.5 sm:p-2 rounded-lg relative ${
                  canUndo() 
                    ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300' 
                    : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
                title="Undo (⌘Z)"
              >
                <Undo size={16} className="sm:w-[18px] sm:h-[18px]" />
                {showUndoTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap"
                  >
                    Changes undone
                  </motion.div>
                )}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRedo}
                disabled={!canRedo()}
                className={`p-1.5 sm:p-2 rounded-lg relative ${
                  canRedo() 
                    ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300' 
                    : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
                title="Redo (⌘⇧Z)"
              >
                <Redo size={16} className="sm:w-[18px] sm:h-[18px]" />
                {showRedoTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap"
                  >
                    Changes redone
                  </motion.div>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                className={`p-1.5 sm:p-2 rounded-lg relative flex items-center gap-1.5 ${
                  hasUnsavedChanges 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                } transition-colors`}
                title="Save (⌘S)"
              >
                <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
                {hasUnsavedChanges ? (
                  <span className="text-xs font-medium">Unsaved</span>
                ) : showSaveTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap"
                  >
                    Saved successfully!
                  </motion.div>
                )}
              </motion.button>
            </div>

            <a
              href="https://github.com/uulasb"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              title="Visit my GitHub"
            >
              <Github size={16} className="sm:w-[18px] sm:h-[18px]" />
            </a>
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            side="left"
            isOpen={isLeftSidebarOpen}
            onClose={() => setLeftSidebarOpen(!isLeftSidebarOpen)}
          />
          <div className="flex-1 flex flex-col">
            <div className="sm:hidden p-2 border-b border-gray-200 dark:border-gray-700">
              <ModelSelector />
            </div>
            <Editor />
          </div>
          <Sidebar
            side="right"
            isOpen={isRightSidebarOpen}
            onClose={() => setRightSidebarOpen(!isRightSidebarOpen)}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;