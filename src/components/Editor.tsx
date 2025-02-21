import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Undo, 
  Redo, 
  RotateCcw,
  MessageSquarePlus, 
  Wand2 
} from 'lucide-react';
import { useEditorStore } from '../store';
import { generateCompletion, getSuggestions } from '../api';
import _ from 'lodash';

const SuggestionBox = ({ suggestions, active, onSelect, style }: {
  suggestions: string[],
  active: number,
  onSelect: (suggestion: string) => void,
  style: React.CSSProperties
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(style);

  useEffect(() => {
    if (boxRef.current) {
      const box = boxRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      const newPosition = calculatePosition(
        { top: style.top as number, left: style.left as number },
        { width: box.width, height: box.height },
        viewport
      );
      setPosition({ ...style, ...newPosition });
    }
  }, [style, suggestions]);

  return (
    <motion.div
      ref={boxRef}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95"
      style={position}
    >
      <div className="max-h-[300px] overflow-y-auto">
        {suggestions.map((suggestion, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              backgroundColor: i === active ? 'rgb(59 130 246 / 0.1)' : 'transparent',
            }}
            whileHover={{ x: 4 }}
            className={`
              group px-4 py-2.5 cursor-pointer flex items-center gap-3 
              hover:bg-blue-50 dark:hover:bg-blue-900/20
              ${i === active ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
              transition-all duration-150 ease-out
            `}
            onClick={() => onSelect(suggestion)}
          >
            <div className={`
              flex-1 text-sm sm:text-base
              ${i === active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}
            `}>
              {suggestion}
            </div>
            
            <div className={`
              text-xs flex items-center gap-1.5
              ${i === active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              transition-opacity duration-150
            `}>
              <motion.div 
                initial={false}
                animate={{ scale: i === active ? 1 : 0.9 }}
                className="flex items-center gap-1 text-gray-400 dark:text-gray-500"
              >
                <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-medium">
                  Tab
                </kbd>
                {i === active && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hidden sm:inline"
                  >
                    to complete
                  </motion.span>
                )}
              </motion.div>
              <motion.div
                animate={{ rotate: i === active ? 90 : 0 }}
                className="text-blue-500 dark:text-blue-400"
              >
                →
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const calculatePosition = (
  cursorCoords: { top: number; left: number },
  boxDimensions: { width: number; height: number },
  viewportDimensions: { width: number; height: number }
) => {
  let { top, left } = cursorCoords;
  const padding = 8;

  // Check if box would overflow right edge
  if (left + boxDimensions.width > viewportDimensions.width - padding) {
    left = Math.max(padding, viewportDimensions.width - boxDimensions.width - padding);
  }

  // Check if box would overflow bottom edge
  if (top + boxDimensions.height > viewportDimensions.height - padding) {
    // Show above cursor instead
    top = top - boxDimensions.height - 10;
  }

  return { top, left };
};

export function Editor() {
  const {
    content,
    setContent,
    selectedModel,
    isGenerating,
    setIsGenerating,
    addMessage,
    setError,
    pushHistory,
    undo,
    redo,
    saveCurrentFile,
    createFile,
    currentFile,
    historyIndex,
    historyLength
  } = useEditorStore();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const [cursorCoords, setCursorCoords] = useState({ top: 0, left: 0 });
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);
  const [showUndoTooltip, setShowUndoTooltip] = useState(false);
  const [showRedoTooltip, setShowRedoTooltip] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 });
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Debounced function to fetch suggestions
  const debouncedGetSuggestions = useCallback(
    _.debounce(async (text: string, pos: number) => {
      try {
        const textUpToCursor = text.slice(0, pos);
        // Only show suggestions after space, period, or when ending a word
        const lastWord = textUpToCursor.split(/[\s.,!?]+/).pop() || '';
        if (lastWord.length >= 2) { // Only show after typing at least 2 characters
          const sugg = await getSuggestions(textUpToCursor, selectedModel);
          // Filter out suggestions that don't add new content
          const filteredSugg = sugg
            .map(s => s.trim())
            .filter(s => s.length > lastWord.length)
            .map(s => s.startsWith(lastWord) ? s.slice(lastWord.length) : s)
            .filter(s => s.length > 0);

          if (filteredSugg.length > 0) {
            setSuggestions(filteredSugg);
            setShowSuggestions(true);
            setActiveSuggestionIndex(0);
          } else {
            setShowSuggestions(false);
          }
        } else {
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Failed to get suggestions:', error);
        setShowSuggestions(false);
      }
    }, 300),
    [selectedModel]
  );

  const insertSuggestion = useCallback((suggestion: string) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const beforeCursor = content.slice(0, cursorPos);
    const afterCursor = content.slice(cursorPos);
    
    // Add a space after the suggestion if there isn't one already
    const spaceAfter = suggestion.endsWith(' ') ? '' : ' ';
    const newContent = beforeCursor + suggestion + spaceAfter + afterCursor;
    setContent(newContent);
    
    // Update cursor position after React re-render
    setTimeout(() => {
      const newCursorPos = cursorPos + suggestion.length + spaceAfter.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      setCursorPos(newCursorPos);
    }, 0);
  }, [content, cursorPos]);

  // Track unsaved changes
  useEffect(() => {
    if (currentFile) {
      setHasUnsavedChanges(content !== currentFile.content);
    }
  }, [content, currentFile]);

  // Handle content changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Push to history
    pushHistory({
      content: newContent,
      cursorPosition: e.target.selectionStart,
      timestamp: Date.now()
    });
    
    // Update cursor position for suggestions
    setCursorPos(e.target.selectionStart);
    
    // Hide suggestions when deleting text
    if (newContent.length < content.length) {
      setShowSuggestions(false);
      return;
    }
    
    // Get suggestions as user types
    debouncedGetSuggestions(newContent, e.target.selectionStart);
  }, [setContent, pushHistory, content, debouncedGetSuggestions]);

  // Handle save
  const handleSave = useCallback(() => {
    try {
      if (!currentFile) {
        // Create a new document with current timestamp
        const timestamp = new Date().toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(',', '');
        const newFileName = `Document ${timestamp}`;
        createFile(newFileName, content);
      } else {
        saveCurrentFile();
      }
      setHasUnsavedChanges(false);
      setShowSaveTooltip(true);
      setTimeout(() => setShowSaveTooltip(false), 1000);
    } catch (err) {
      setError('Failed to save file');
      setTimeout(() => setError(null), 2000);
    }
  }, [currentFile, content, createFile, saveCurrentFile, setError]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    // Save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    // Undo/Redo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
        setShowRedoTooltip(true);
        setTimeout(() => setShowRedoTooltip(false), 1000);
      } else {
        undo();
        setShowUndoTooltip(true);
        setTimeout(() => setShowUndoTooltip(false), 1000);
      }
      return;
    }

    // Tab or Ctrl/Cmd + Space to trigger suggestions
    if (e.key === 'Tab' || ((e.ctrlKey || e.metaKey) && e.key === ' ')) {
      e.preventDefault();
      if (showSuggestions) {
        insertSuggestion(suggestions[activeSuggestionIndex]);
        setShowSuggestions(false);
      } else {
        const textUpToCursor = content.slice(0, cursorPos);
        try {
          const sugg = await getSuggestions(textUpToCursor, selectedModel);
          if (sugg.length > 0) {
            setSuggestions(sugg);
            setShowSuggestions(true);
            setActiveSuggestionIndex(0);
          }
        } catch (error) {
          console.error('Failed to get suggestions:', error);
          setError('Failed to get suggestions. Please try again.');
          setTimeout(() => setError(null), 2000);
        }
      }
      return;
    }

    // Handle suggestions
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(i => 
          i < suggestions.length - 1 ? i + 1 : i
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(i => i > 0 ? i - 1 : i);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertSuggestion(suggestions[activeSuggestionIndex]);
        setShowSuggestions(false);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  }, [
    showSuggestions, 
    suggestions, 
    activeSuggestionIndex, 
    content, 
    cursorPos, 
    undo, 
    redo, 
    handleSave, 
    setError,
    insertSuggestion,
    selectedModel,
    setShowSaveTooltip,
    setShowUndoTooltip,
    setShowRedoTooltip
  ]);

  const updateCursorCoords = useCallback(() => {
    if (editorRef.current) {
      const textarea = editorRef.current;
      const { selectionStart } = textarea;
      
      // Create a temporary div to measure text
      const div = document.createElement('div');
      div.style.cssText = window.getComputedStyle(textarea).cssText;
      div.style.height = 'auto';
      div.style.position = 'absolute';
      div.style.visibility = 'hidden';
      div.style.whiteSpace = 'pre-wrap';
      
      // Get text before cursor
      const textBeforeCursor = textarea.value.substring(0, selectionStart);
      div.textContent = textBeforeCursor;
      
      document.body.appendChild(div);
      const coords = {
        top: div.offsetHeight + textarea.offsetTop + 8, // 8px padding
        left: div.offsetWidth % textarea.offsetWidth + textarea.offsetLeft + 8
      };
      document.body.removeChild(div);
      
      setCursorCoords(coords);
    }
  }, []);

  // Update cursor coords on content change and selection
  useEffect(() => {
    updateCursorCoords();
  }, [cursorPos, content, updateCursorCoords]);

  // Restore cursor position after undo/redo
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.selectionStart = cursorPos;
      editorRef.current.selectionEnd = cursorPos;
    }
  }, [content, cursorPos]);

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      const userMessage = { role: 'user' as const, content };
      addMessage(userMessage);

      const response = await generateCompletion(
        [userMessage],
        selectedModel
      );

      addMessage({ role: 'assistant', content: response });
      setContent(content + response);
    } catch (error) {
      console.error('Generation error:', error);
      setError('Failed to generate completion. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [content, isGenerating, selectedModel, addMessage, setContent, setError, setIsGenerating]);

  // Clear suggestions when clicking outside the editor
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('textarea')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      setViewportDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        {currentFile && (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 bg-gray-500 text-white rounded-md text-sm flex items-center gap-1 hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                undo();
                setShowUndoTooltip(true);
                setTimeout(() => setShowUndoTooltip(false), 1000);
              }}
              disabled={historyIndex === 0}
              title="⌘/Ctrl + Z"
            >
              <Undo size={16} />
              {showUndoTooltip && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-1 bg-black text-white px-2 py-1 rounded text-xs"
                >
                  Undone!
                </motion.span>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 bg-gray-500 text-white rounded-md text-sm flex items-center gap-1 hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                redo();
                setShowRedoTooltip(true);
                setTimeout(() => setShowRedoTooltip(false), 1000);
              }}
              disabled={historyIndex === historyLength - 1}
              title="⌘/Ctrl + Shift + Z"
            >
              <Redo size={16} />
              {showRedoTooltip && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-1 bg-black text-white px-2 py-1 rounded text-xs"
                >
                  Redone!
                </motion.span>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 bg-red-500 text-white rounded-md text-sm flex items-center gap-1 hover:bg-red-600 transition-colors"
              onClick={() => {
                if (confirm('Are you sure you want to revert all changes?')) {
                  while (historyIndex > 0) {
                    undo();
                  }
                }
              }}
              title="Revert to original"
            >
              <RotateCcw size={16} />
            </motion.button>
          </>
        )}
      </div>
      <div className="relative flex-1">
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="flex-1 w-full h-full p-4 resize-none outline-none bg-transparent text-gray-800 dark:text-gray-200"
          placeholder="Start writing..."
          spellCheck="false"
          autoComplete="off"
          autoCapitalize="off"
        />
        
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <SuggestionBox
              suggestions={suggestions}
              active={activeSuggestionIndex}
              onSelect={insertSuggestion}
              style={{
                top: cursorCoords.top + 24,
                left: cursorCoords.left,
                maxWidth: Math.min(400, viewportDimensions.width - 32),
                minWidth: Math.min(200, viewportDimensions.width - 32)
              }}
            />
          )}
        </AnimatePresence>
      </div>
      {content.trim().length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <button
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            onClick={() => {/* Implement comment feature */}}
          >
            <MessageSquarePlus size={20} />
          </button>
          <button
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ${hasUnsavedChanges ? 'text-blue-500' : ''}`}
            onClick={handleSave}
            title="⌘/Ctrl + S"
          >
            <Save size={20} />
            {showSaveTooltip && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-1 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap"
              >
                Saved!
              </motion.span>
            )}
          </button>
          <button
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <Wand2 size={20} className={isGenerating ? 'animate-spin' : ''} />
          </button>
          <span className="px-3 text-gray-500 dark:text-gray-400">|</span>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Complete'}
          </button>
        </motion.div>
      )}
    </div>
  );
}