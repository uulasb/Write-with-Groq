import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fileSystem, FileMetadata } from './services/fileSystem';
import { AIModel, AI_MODELS } from './config/models';

interface EditorState {
  content: string;
  cursorPosition: number;
  timestamp: number;
}

interface EditorStore {
  content: string;
  setContent: (content: string) => void;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  error: string | null;
  setError: (error: string | null) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  messages: any[];
  addMessage: (message: any) => void;
  
  // History management
  history: EditorState[];
  currentHistoryIndex: number;
  pushHistory: (state: EditorState) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // File management
  currentFile: FileMetadata | null;
  setCurrentFile: (file: FileMetadata | null) => void;
  files: FileMetadata[];
  loadFiles: () => void;
  createFile: (name: string, content?: string) => void;
  saveCurrentFile: () => void;
  deleteFile: (id: string) => void;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      content: '',
      setContent: (content) => {
        set({ content });
        // Don't auto-save on content change
      },
      
      selectedModel: AI_MODELS[0],
      setSelectedModel: (model) => set({ selectedModel: model }),
      
      error: null,
      setError: (error) => set({ error }),
      
      isGenerating: false,
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      
      messages: [],
      addMessage: (message) => set(state => ({ 
        messages: [...state.messages, message] 
      })),

      // History management
      history: [{ content: '', cursorPosition: 0, timestamp: Date.now() }],
      currentHistoryIndex: 0,
      
      pushHistory: (state) => set(store => {
        // Only push if content changed
        if (store.history[store.currentHistoryIndex].content === state.content) {
          return store;
        }
        
        const newHistory = [
          ...store.history.slice(0, store.currentHistoryIndex + 1),
          { ...state, timestamp: Date.now() }
        ];
        
        // Limit history size
        if (newHistory.length > 100) {
          newHistory.shift();
        }
        
        return {
          history: newHistory,
          currentHistoryIndex: newHistory.length - 1
        };
      }),
      
      undo: () => set(store => {
        if (store.currentHistoryIndex > 0) {
          const newIndex = store.currentHistoryIndex - 1;
          const previousState = store.history[newIndex];
          return {
            content: previousState.content,
            currentHistoryIndex: newIndex
          };
        }
        return store;
      }),
      
      redo: () => set(store => {
        if (store.currentHistoryIndex < store.history.length - 1) {
          const newIndex = store.currentHistoryIndex + 1;
          const nextState = store.history[newIndex];
          return {
            content: nextState.content,
            currentHistoryIndex: newIndex
          };
        }
        return store;
      }),

      canUndo: () => {
        const store = get();
        return store.currentHistoryIndex > 0;
      },

      canRedo: () => {
        const store = get();
        return store.currentHistoryIndex < store.history.length - 1;
      },
      
      // File management
      currentFile: null,
      setCurrentFile: (file) => {
        set({ 
          currentFile: file,
          content: file?.content || '',
          history: [{ 
            content: file?.content || '', 
            cursorPosition: 0,
            timestamp: Date.now()
          }],
          currentHistoryIndex: 0
        });
      },
      
      files: [],
      loadFiles: () => {
        const files = fileSystem.getFiles();
        set({ files });
      },
      
      createFile: (name, content = '') => {
        const newFile = fileSystem.createFile(name, content);
        get().loadFiles();
        get().setCurrentFile(newFile);
      },
      
      saveCurrentFile: () => {
        const { currentFile, content } = get();
        if (currentFile) {
          fileSystem.updateFile(currentFile.id, { content });
          get().loadFiles();
          // Show save feedback
          set({ error: 'File saved successfully!' });
          setTimeout(() => set({ error: null }), 2000);
        }
      },
      
      deleteFile: (id) => {
        const { currentFile } = get();
        fileSystem.deleteFile(id);
        if (currentFile?.id === id) {
          set({ 
            currentFile: null, 
            content: '',
            history: [{ content: '', cursorPosition: 0, timestamp: Date.now() }],
            currentHistoryIndex: 0
          });
        }
        get().loadFiles();
      }
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        files: state.files,
        currentFile: state.currentFile,
        content: state.content,
        history: state.history,
        currentHistoryIndex: state.currentHistoryIndex
      })
    }
  )
);