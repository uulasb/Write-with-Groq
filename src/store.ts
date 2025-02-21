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
  historyIndex: number; // Alias for currentHistoryIndex
  historyLength: number; // Total history length
  pushHistory: (state: EditorState) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  revertAll: () => void;
  
  // File management
  currentFile: FileMetadata | null;
  setCurrentFile: (file: FileMetadata | null) => void;
  files: FileMetadata[];
  loadFiles: () => void;
  createFile: (name: string, content?: string) => void;
  saveCurrentFile: () => void;
  deleteFile: (id: string) => void;
  
  hasUnsavedChanges: boolean;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      content: '',
      setContent: (content) => {
        const store = get();
        set({ 
          content,
          hasUnsavedChanges: store.currentFile ? content !== store.currentFile.content : content.length > 0
        });
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
      
      get historyIndex() {
        return get().currentHistoryIndex;
      },
      
      get historyLength() {
        return get().history.length;
      },
      
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

        // Update hasUnsavedChanges
        const hasUnsavedChanges = store.currentFile ? state.content !== store.currentFile.content : state.content.length > 0;
        
        return {
          history: newHistory,
          currentHistoryIndex: newHistory.length - 1,
          hasUnsavedChanges
        };
      }),
      
      undo: () => set(store => {
        if (store.currentHistoryIndex > 0) {
          const newIndex = store.currentHistoryIndex - 1;
          const previousState = store.history[newIndex];
          const hasUnsavedChanges = store.currentFile ? previousState.content !== store.currentFile.content : previousState.content.length > 0;
          return {
            content: previousState.content,
            currentHistoryIndex: newIndex,
            hasUnsavedChanges
          };
        }
        return store;
      }),
      
      redo: () => set(store => {
        if (store.currentHistoryIndex < store.history.length - 1) {
          const newIndex = store.currentHistoryIndex + 1;
          const nextState = store.history[newIndex];
          const hasUnsavedChanges = store.currentFile ? nextState.content !== store.currentFile.content : nextState.content.length > 0;
          return {
            content: nextState.content,
            currentHistoryIndex: newIndex,
            hasUnsavedChanges
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
      
      revertAll: () => set(store => {
        const firstState = store.history[0];
        return {
          content: firstState.content,
          currentHistoryIndex: 0
        };
      }),
      
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
          currentHistoryIndex: 0,
          hasUnsavedChanges: false
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
          set({ error: 'File saved successfully!', hasUnsavedChanges: false });
          setTimeout(() => set({ error: null }), 2000);
        } else {
          // Create new file if none exists
          const timestamp = new Date().toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }).replace(',', '');
          const newFileName = `Document ${timestamp}`;
          const newFile = fileSystem.createFile(newFileName, content);
          set({ currentFile: newFile });
          get().loadFiles();
          set({ error: 'New file created and saved!' });
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
            currentHistoryIndex: 0,
            hasUnsavedChanges: false
          });
        }
        get().loadFiles();
      },
      
      hasUnsavedChanges: false
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        files: state.files,
        currentFile: state.currentFile,
        content: state.content,
        history: state.history,
        currentHistoryIndex: state.currentHistoryIndex,
        hasUnsavedChanges: state.hasUnsavedChanges
      })
    }
  )
);