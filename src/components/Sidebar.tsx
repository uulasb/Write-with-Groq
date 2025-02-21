import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  PanelLeftClose, 
  PanelRightClose, 
  Zap, 
  BarChart, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  MessageSquare, 
  Send, 
  Loader2, 
  Maximize2, 
  Minimize2, 
  PlusCircle, 
  MoreVertical, 
  Trash2, 
  XCircle 
} from 'lucide-react';
import { useEditorStore } from '../store';
import { useModelStore } from '../store/modelStore';
import { getInsights } from '../api/insights';
import { getSuggestions } from '../api/suggestions';
import { getTextStats } from '../utils/textStats';
import { Message, sendChatMessage } from '../api/chat';
import { fileSystem } from '../services/fileSystem';

interface SidebarProps {
  side: 'left' | 'right';
  isOpen: boolean;
  onClose: () => void;
}

interface InsightStats {
  tone: string;
  clarity: number;
  engagement: number;
  readability: string;
}

export function Sidebar({ side, isOpen, onClose }: SidebarProps) {
  const { 
    content, 
    files, 
    loadFiles, 
    createFile, 
    deleteFile,
    currentFile, 
    setCurrentFile,
    setContent 
  } = useEditorStore();
  const { selectedModel } = useModelStore();
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [stats, setStats] = useState<InsightStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textStats = getTextStats(content);

  const recentSessions = files;

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Check for unsaved changes
  useEffect(() => {
    const currentContent = content.trim();
    const fileContent = currentFile?.content.trim() || '';
    setUnsavedChanges(currentContent !== fileContent);
  }, [content, currentFile]);

  // Fetch insights when content changes
  useEffect(() => {
    if (side === 'right' && content.trim().length > 0) {
      const fetchInsights = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const insights = await getInsights(content, selectedModel);
          setSuggestions(insights.suggestions);
          setStats(insights.stats);
        } catch (err) {
          setError('Failed to get AI insights. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };

      // Debounce the API call
      const timer = setTimeout(fetchInsights, 1000);
      return () => clearTimeout(timer);
    }
  }, [content, selectedModel, side]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const newMessage: Message = {
      role: 'user',
      content: inputMessage
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await sendChatMessage(
        inputMessage,
        selectedModel,
        messages
      );

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response
        }
      ]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show error in chat
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) {
      setError('Please enter a file name');
      return;
    }
    
    if (files.some(f => f.name.toLowerCase() === newFileName.trim().toLowerCase())) {
      setError('A file with this name already exists');
      return;
    }
    
    try {
      createFile(newFileName, '');
      setNewFileName('');
      setShowNewFileInput(false);
      setError(null);
    } catch (err) {
      setError('Failed to create file. Please try again.');
    }
  };

  const handleDeleteFile = (id: string) => {
    deleteFile(id);
  };

  const handleFileSwitch = (file: any) => {
    setCurrentFile(file);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={`flex ${side === 'left' ? 'border-r' : 'border-l'} border-gray-200 dark:border-gray-700`}>
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="expanded"
            initial={{ width: 0 }}
            animate={{ width: side === 'left' ? 'min(320px, 80vw)' : 'min(384px, 90vw)' }}
            exit={{ width: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex flex-col bg-gray-50 dark:bg-gray-800"
          >
            <div className="flex items-center p-3 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                {side === 'left' ? (
                  <PanelLeftClose size={18} className="text-gray-500" />
                ) : (
                  <PanelRightClose size={18} className="text-gray-500" />
                )}
              </button>
              <div className="flex items-center space-x-2 ml-2">
                {side === 'left' ? (
                  <FileText size={18} className="text-gray-500" />
                ) : (
                  <Zap size={18} className="text-gray-500" />
                )}
                <span className="font-medium">
                  {side === 'left' ? 'Documents' : 'AI Assistant'}
                </span>
              </div>
            </div>
            {side === 'left' ? (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-y-auto p-4 space-y-6"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Documents
                      </h3>
                      {showNewFileInput && (
                        <button
                          onClick={() => setShowNewFileInput(false)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>

                    {showNewFileInput ? (
                      <div className="mb-4">
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          handleCreateFile();
                        }}>
                          <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            placeholder="Enter file name..."
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                        </form>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewFileInput(true)}
                        className="w-full flex items-center p-3 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400"
                      >
                        <PlusCircle size={18} className="mr-3 flex-shrink-0" />
                        <span>New Document</span>
                      </button>
                    )}

                    <div className="mt-6">
                      <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                        Recent Files
                      </h3>
                      <div className="space-y-2">
                        {files.map(file => (
                          <div
                            key={file.id}
                            className={`
                              group relative
                              w-full flex items-center justify-between p-3 rounded-lg 
                              hover:bg-white dark:hover:bg-gray-700 
                              text-gray-900 dark:text-gray-100
                              cursor-pointer transition-colors
                              ${currentFile?.id === file.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                            `}
                          >
                            <button
                              className="flex-1 flex items-center min-w-0"
                              onClick={() => handleFileSwitch(file)}
                            >
                              <FileText size={18} className="mr-3 flex-shrink-0" />
                              <div className="truncate">
                                <div className="truncate font-medium">
                                  {file.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatDate(new Date(file.updatedAt))}
                                </div>
                              </div>
                            </button>
                            
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFile(file.id);
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-red-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-y-auto p-4 space-y-6"
                >
                  {error ? (
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                        <AlertCircle size={16} />
                        <p className="text-sm">{error}</p>
                      </div>
                    </div>
                  ) : content.trim().length === 0 ? (
                    <>
                      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-700/50 text-center mb-4">
                        <p className="text-gray-500 dark:text-gray-400">
                          Start writing to see AI insights
                        </p>
                      </div>
                      
                      {/* Chat Interface - Always visible */}
                      <motion.div
                        className={`p-4 rounded-lg bg-white dark:bg-gray-700/50 ${
                          isChatFullscreen ? 'flex-1 flex flex-col' : ''
                        }`}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                            <MessageSquare size={16} className="text-green-500" />
                            <span>Chat with AI</span>
                          </h3>
                          <button
                            onClick={() => setIsChatFullscreen(!isChatFullscreen)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            {isChatFullscreen ? (
                              <Minimize2 size={16} className="text-gray-500" />
                            ) : (
                              <Maximize2 size={16} className="text-gray-500" />
                            )}
                          </button>
                        </div>

                        <div className={`space-y-4 ${isChatFullscreen ? 'flex-1 flex flex-col' : ''}`}>
                          <div className={`${
                            isChatFullscreen ? 'flex-1' : 'h-[200px]'
                          } overflow-y-auto space-y-3 mb-3`}>
                            {messages.length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                                Ask me anything about your writing!
                              </p>
                            ) : (
                              messages.map((msg, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ x: msg.role === 'user' ? 20 : -20, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ duration: 0.2 }}
                                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`
                                      max-w-[85%] p-3 rounded-lg
                                      ${msg.role === 'user' 
                                        ? 'bg-blue-500 text-white ml-4' 
                                        : 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 mr-4'
                                      }
                                    `}
                                  >
                                    <p className="text-sm">{msg.content}</p>
                                    {msg.timestamp && (
                                      <p className="text-xs mt-1 opacity-70">
                                        {msg.timestamp.toLocaleTimeString()}
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              ))
                            )}
                            <div ref={chatEndRef} />
                          </div>

                          <form onSubmit={handleSendMessage} className="relative">
                            <input
                              type="text"
                              value={inputMessage}
                              onChange={(e) => setInputMessage(e.target.value)}
                              placeholder="Type your message..."
                              className="w-full px-4 py-2 pr-12 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                              disabled={isSending}
                            />
                            <button
                              type="submit"
                              disabled={isSending || !inputMessage.trim()}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSending ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Send size={18} />
                              )}
                            </button>
                          </form>
                        </div>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      {/* Show insights only when not in fullscreen chat mode */}
                      {!isChatFullscreen && (
                        <>
                          <motion.div 
                            className="p-4 rounded-lg bg-white dark:bg-gray-700/50"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                          >
                            <h3 className="text-sm font-medium mb-3 flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                              <Zap size={16} className="text-yellow-500" />
                              <span>Suggestions</span>
                            </h3>
                            <div className="space-y-3">
                              {isLoading ? (
                                <div className="animate-pulse space-y-3">
                                  {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-gray-200 dark:bg-gray-600 rounded-lg" />
                                  ))}
                                </div>
                              ) : (
                                suggestions.map((suggestion, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                                    onClick={async () => {
                                      try {
                                        const newSuggestions = await getSuggestions(suggestion, selectedModel);
                                        setSuggestions(newSuggestions);
                                      } catch (err) {
                                        setError('Failed to get suggestions. Please try again.');
                                      }
                                    }}
                                  >
                                    <p className="text-gray-700 dark:text-gray-300">
                                      {suggestion}
                                    </p>
                                  </motion.div>
                                ))
                              )}
                            </div>
                          </motion.div>

                          {stats && (
                            <>
                              <motion.div 
                                className="p-4 rounded-lg bg-white dark:bg-gray-700/50"
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                              >
                                <h3 className="text-sm font-medium mb-3 flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                                  <BarChart size={16} className="text-blue-500" />
                                  <span>Writing Stats</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                  {[
                                    { 
                                      label: 'Words', 
                                      value: textStats.words.toLocaleString(),
                                      icon: '📝'
                                    },
                                    { 
                                      label: 'Reading Time', 
                                      value: textStats.readingTime,
                                      icon: '⏱️'
                                    }
                                  ].map((stat, i) => (
                                    <motion.div
                                      key={stat.label}
                                      initial={{ scale: 0.9, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ delay: 0.2 + i * 0.1 }}
                                      className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <span className="text-lg">{stat.icon}</span>
                                        <div>
                                          <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {stat.label}
                                          </div>
                                          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {stat.value}
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>

                              <motion.div 
                                className="p-4 rounded-lg bg-white dark:bg-gray-700/50"
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                              >
                                <h3 className="text-sm font-medium mb-3 flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                                  <BarChart size={16} className="text-blue-500" />
                                  <span>Writing Analysis</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                  {[
                                    { label: 'Tone', value: stats.tone },
                                    { label: 'Readability', value: stats.readability },
                                    { 
                                      label: 'Clarity', 
                                      value: `${stats.clarity}%`,
                                      progress: stats.clarity 
                                    },
                                    { 
                                      label: 'Engagement', 
                                      value: `${stats.engagement}%`,
                                      progress: stats.engagement 
                                    }
                                  ].map((stat, i) => (
                                    <motion.div
                                      key={stat.label}
                                      initial={{ scale: 0.9, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ delay: 0.2 + i * 0.1 }}
                                      className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700"
                                    >
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {stat.label}
                                      </div>
                                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {stat.value}
                                      </div>
                                      {'progress' in stat && (
                                        <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stat.progress}%` }}
                                            transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                                            className="h-full bg-blue-500 dark:bg-blue-400 rounded-full"
                                          />
                                        </div>
                                      )}
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </>
                      )}

                      {/* Chat Interface */}
                      <motion.div
                        className={`p-4 rounded-lg bg-white dark:bg-gray-700/50 ${
                          isChatFullscreen ? 'flex-1 flex flex-col' : ''
                        }`}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                            <MessageSquare size={16} className="text-green-500" />
                            <span>Chat with AI</span>
                          </h3>
                          <button
                            onClick={() => setIsChatFullscreen(!isChatFullscreen)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            {isChatFullscreen ? (
                              <Minimize2 size={16} className="text-gray-500" />
                            ) : (
                              <Maximize2 size={16} className="text-gray-500" />
                            )}
                          </button>
                        </div>

                        <div className={`space-y-4 ${isChatFullscreen ? 'flex-1 flex flex-col' : ''}`}>
                          <div className={`${
                            isChatFullscreen ? 'flex-1' : 'h-[200px]'
                          } overflow-y-auto space-y-3 mb-3`}>
                            {messages.length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                                Ask me anything about your writing!
                              </p>
                            ) : (
                              messages.map((msg, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ x: msg.role === 'user' ? 20 : -20, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ duration: 0.2 }}
                                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`
                                      max-w-[85%] p-3 rounded-lg
                                      ${msg.role === 'user' 
                                        ? 'bg-blue-500 text-white ml-4' 
                                        : 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 mr-4'
                                      }
                                    `}
                                  >
                                    <p className="text-sm">{msg.content}</p>
                                    {msg.timestamp && (
                                      <p className="text-xs mt-1 opacity-70">
                                        {msg.timestamp.toLocaleTimeString()}
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              ))
                            )}
                            <div ref={chatEndRef} />
                          </div>

                          <form onSubmit={handleSendMessage} className="relative">
                            <input
                              type="text"
                              value={inputMessage}
                              onChange={(e) => setInputMessage(e.target.value)}
                              placeholder="Type your message..."
                              className="w-full px-4 py-2 pr-12 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                              disabled={isSending}
                            />
                            <button
                              type="submit"
                              disabled={isSending || !inputMessage.trim()}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSending ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Send size={18} />
                              )}
                            </button>
                          </form>
                        </div>
                      </motion.div>
                    </>
                  )}
                </motion.div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            onClick={onClose}
            className={`
              flex items-center justify-center w-10 
              bg-gray-50 hover:bg-gray-100 
              dark:bg-gray-800 dark:hover:bg-gray-700/80
              transition-colors
              ${side === 'left' ? 'border-r' : 'border-l'} border-gray-200 dark:border-gray-700
            `}
          >
            {side === 'left' ? (
              <ChevronRight size={20} className="text-gray-500" />
            ) : (
              <ChevronLeft size={20} className="text-gray-500" />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}