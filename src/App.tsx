import React, { useState } from 'react';
import { Editor } from './components/Editor';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import { ModelSelector } from './components/ModelSelector';
import { Save, Undo, Redo } from 'lucide-react';
import { useEditorStore } from './store';
import waiLogo from '../Wai.svg';

function App() {
  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(true);
  const { 
    currentFile, 
    saveCurrentFile, 
    undo, 
    redo,
    canUndo,
    canRedo
  } = useEditorStore();

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
              <button
                onClick={undo}
                disabled={!canUndo()}
                className={`p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400
                  ${!canUndo() && 'opacity-50 cursor-not-allowed'}`}
                title="Undo (⌘Z)"
              >
                <Undo size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo()}
                className={`p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400
                  ${!canRedo() && 'opacity-50 cursor-not-allowed'}`}
                title="Redo (⌘⇧Z)"
              >
                <Redo size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              <button
                onClick={saveCurrentFile}
                disabled={!currentFile}
                className={`p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 
                  ${!currentFile && 'opacity-50 cursor-not-allowed'}`}
                title="Save (⌘S)"
              >
                <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2" />
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