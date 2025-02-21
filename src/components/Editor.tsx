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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">↓</kbd>
              to navigate
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">Tab</kbd>
              to select
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">Esc</kbd>
              to dismiss
            </span>
          </div>
        </div>
        
        {suggestions.map((suggestion, i) => {
          const isActive = i === active;
          const isHovered = i === hoveredIndex;
          
          return (
            <motion.div
              key={i}
              initial={false}
              animate={{
                backgroundColor: isActive || isHovered ? 'rgb(59 130 246 / 0.1)' : 'transparent',
                x: isActive || isHovered ? 4 : 0
              }}
              className={`
                group px-4 py-2.5 cursor-pointer flex items-center gap-3 
                hover:bg-blue-50 dark:hover:bg-blue-900/20
                ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                transition-all duration-150 ease-out
              `}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex-1 flex items-center gap-2">
                <div className={`
                  flex-1 text-sm sm:text-base
                  ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}
                `}>
                  {suggestion}
                </div>
                
                <motion.div 
                  animate={{ 
                    opacity: isActive || isHovered ? 1 : 0,
                    scale: isActive || isHovered ? 1 : 0.9 
                  }}
                  className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500"
                >
                  <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-medium">
                    Tab
                  </kbd>
                  <motion.div
                    animate={{ rotate: isActive || isHovered ? 90 : 0 }}
                    className="text-blue-500 dark:text-blue-400"
                  >
                    →
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
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
        // Show suggestions after typing 2 characters or when explicitly triggered
        const lastWord = textUpToCursor.split(/[\s.,!?]+/).pop() || '';
        
        // Don't show suggestions while typing numbers
        if (/^\d+$/.test(lastWord)) {
          setShowSuggestions(false);
          return;
        }

        if (lastWord.length >= 2) {
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
            
            // Update cursor coordinates for the suggestion box
            const textarea = editorRef.current;
            if (textarea) {
              const { selectionStart } = textarea;
              const textBeforeCursor = textarea.value.substring(0, selectionStart);
              const lines = textBeforeCursor.split('\n');
              const currentLineNumber = lines.length - 1;
              const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
              
              const computedStyle = window.getComputedStyle(textarea);
              const lineHeight = parseInt(computedStyle.lineHeight);
              const paddingTop = parseInt(computedStyle.paddingTop);
              const paddingLeft = parseInt(computedStyle.paddingLeft);
              const fontSize = parseInt(computedStyle.fontSize);
              
              const currentLine = textBeforeCursor.slice(currentLineStart);
              const textWidth = getTextWidth(currentLine, `${fontSize}px ${computedStyle.fontFamily}`);
              
              const top = textarea.offsetTop + paddingTop + (currentLineNumber * lineHeight) + lineHeight;
              const left = textarea.offsetLeft + paddingLeft + textWidth;
              
              setCursorCoords({ top, left });
            }
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
    }, 150), // Reduced debounce time for more responsive feel
    [selectedModel]
  );

  // Helper function to measure text width
  const getTextWidth = (text: string, font: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = font;
      return context.measureText(text).width;
    }
    return 0;
  };

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
    const { selectionStart } = e.target;
    setCursorPos(selectionStart);
    
    // Update cursor coordinates
    const textBeforeCursor = e.target.value.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLineNumber = lines.length - 1;
    const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    
    const computedStyle = window.getComputedStyle(e.target);
    const lineHeight = parseInt(computedStyle.lineHeight);
    const paddingTop = parseInt(computedStyle.paddingTop);
    const paddingLeft = parseInt(computedStyle.paddingLeft);
    const fontSize = parseInt(computedStyle.fontSize);
    
    const currentLine = textBeforeCursor.slice(currentLineStart);
    const textWidth = getTextWidth(currentLine, `${fontSize}px ${computedStyle.fontFamily}`);
    
    const top = e.target.offsetTop + paddingTop + (currentLineNumber * lineHeight) + lineHeight;
    const left = e.target.offsetLeft + paddingLeft + textWidth;
    
    setCursorCoords({ top, left });
    
    // Get suggestions as user types
    debouncedGetSuggestions(newContent, selectionStart);
  }, [setContent, pushHistory, debouncedGetSuggestions]);

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
  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

    // Suggestions navigation
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setActiveSuggestionIndex(i => (i > 0 ? i - 1 : suggestions.length - 1));
          return;
        case 'ArrowDown':
          e.preventDefault();
          setActiveSuggestionIndex(i => (i < suggestions.length - 1 ? i + 1 : 0));
          return;
        case 'Tab':
        case 'Enter':
          e.preventDefault();
          insertSuggestion(suggestions[activeSuggestionIndex]);
          setShowSuggestions(false);
          return;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          return;
      }
    }

    // Explicitly trigger suggestions with Ctrl/Cmd + Space
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      debouncedGetSuggestions(textarea.value, textarea.selectionStart);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      
      if (showSuggestions) {
        insertSuggestion(suggestions[activeSuggestionIndex]);
      } else {
        // Get text up to cursor
        const textarea = e.currentTarget;
        const pos = textarea.selectionStart;
        const textUpToCursor = textarea.value.slice(0, pos);
        
        try {
          const sugg = await getSuggestions(textUpToCursor, selectedModel);
          if (sugg.length > 0) {
            setSuggestions(sugg);
            setShowSuggestions(true);
            setActiveSuggestionIndex(0);
            updateCursorCoords(textarea);
          }
        } catch (error) {
          console.error('Failed to get suggestions:', error);
        }
      }
      return;
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

  // Helper function to update cursor coordinates
  const updateCursorCoords = useCallback((textarea: HTMLTextAreaElement) => {
    const { selectionStart } = textarea;
    const textBeforeCursor = textarea.value.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLineNumber = lines.length - 1;
    const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseInt(computedStyle.lineHeight);
    const paddingTop = parseInt(computedStyle.paddingTop);
    const paddingLeft = parseInt(computedStyle.paddingLeft);
    const fontSize = parseInt(computedStyle.fontSize);
    const scrollTop = textarea.scrollTop;
    
    const currentLine = textBeforeCursor.slice(currentLineStart);
    const textWidth = getTextWidth(currentLine, `${fontSize}px ${computedStyle.fontFamily}`);
    
    // Calculate position considering scroll
    const top = textarea.offsetTop + paddingTop + (currentLineNumber * lineHeight) - scrollTop;
    const left = textarea.offsetLeft + paddingLeft + Math.min(textWidth, textarea.clientWidth - 400);
    
    setCursorCoords({ top, left });
  }, []);

  // Update cursor coords on content change and selection
  useEffect(() => {
    updateCursorCoords(editorRef.current as HTMLTextAreaElement);
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
      <div className="relative flex-1">
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={() => editorRef.current && updateCursorCoords(editorRef.current)}
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
                position: 'absolute',
                top: `${cursorCoords.top + 24}px`,
                left: `${cursorCoords.left}px`,
                maxWidth: '400px',
                minWidth: '200px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 50,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
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