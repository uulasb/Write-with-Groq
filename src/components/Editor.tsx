import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Wand2 } from 'lucide-react';
import { useEditorStore } from '../store';
import { generateCompletion, getSuggestions } from '../api';
import _ from 'lodash';

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
    currentFile
  } = useEditorStore();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const [cursorCoords, setCursorCoords] = useState({ top: 0, left: 0 });
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

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    // Save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (currentFile) {
        saveCurrentFile();
      } else {
        setError('Create or select a file first');
        setTimeout(() => setError(null), 2000);
      }
      return;
    }

    // Undo/Redo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
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
          setSuggestions(sugg);
          setShowSuggestions(true);
          setActiveSuggestionIndex(0);
        } catch (error) {
          console.error('Failed to get suggestions:', error);
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
    saveCurrentFile, 
    currentFile,
    setError,
    insertSuggestion,
    selectedModel
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

  // Handle content changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Save cursor position
    const cursorPos = e.target.selectionStart;
    setCursorPos(cursorPos);
    
    // Push to history
    pushHistory({
      content: newContent,
      cursorPosition: cursorPos,
      timestamp: Date.now()
    });
    
    // Hide suggestions when deleting text
    if (newContent.length < content.length) {
      setShowSuggestions(false);
      return;
    }
    
    // Get suggestions as user types
    debouncedGetSuggestions(newContent, cursorPos);
  }, [setContent, pushHistory, content, debouncedGetSuggestions]);

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

  return (
    <div className="flex-1 flex flex-col relative">
      <textarea
        ref={editorRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={(e) => setCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
        className="w-full h-full p-8 resize-none outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        placeholder="Start typing to see suggestions..."
        style={{ fontSize: '16px', lineHeight: '1.6' }}
      />

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            style={{
              position: 'absolute',
              top: `${cursorCoords.top}px`,
              left: `${cursorCoords.left}px`,
              maxWidth: 'calc(100% - 4rem)'
            }}
            className="flex flex-col space-y-1.5 z-10"
          >
            <div className="h-4 w-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50 dark:to-gray-900/50" />
            </div>
            {suggestions.map((sugg, index) => (
              <motion.button
                key={index}
                initial={{ x: -20, opacity: 0 }}
                animate={{ 
                  x: 0, 
                  opacity: 1,
                  scale: index === activeSuggestionIndex ? 1.02 : 1,
                }}
                transition={{ 
                  delay: index * 0.05,
                  duration: 0.2,
                  scale: { duration: 0.1 }
                }}
                onClick={() => {
                  insertSuggestion(sugg);
                  setShowSuggestions(false);
                }}
                className={`
                  text-left px-4 py-2.5 text-sm 
                  bg-white/95 dark:bg-gray-800/95 
                  border border-gray-200 dark:border-gray-700 
                  rounded-lg
                  hover:bg-blue-50 dark:hover:bg-blue-900 
                  transition-all duration-200
                  shadow-sm hover:shadow-md
                  backdrop-blur-sm
                  ${index === activeSuggestionIndex ? 'border-blue-400 dark:border-blue-500 bg-blue-50/90 dark:bg-blue-900/50 shadow-md' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono w-5 text-right">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      <span className="opacity-50">{suggestions[index].startsWith(' ') ? '·' : ''}</span>
                      {sugg}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                      {index === 0 ? 'tab' : index === 1 ? 'tab ×2' : 'tab ×3'}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-center text-gray-400 dark:text-gray-500 mt-1 pb-1"
            >
              <span className="px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800/50">
                ↑/↓ to navigate • Enter to select • Esc to dismiss
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
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
      </AnimatePresence>
    </div>
  );
}