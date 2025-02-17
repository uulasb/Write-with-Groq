import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIModel, AI_MODELS } from '../config/models';

interface ModelState {
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      selectedModel: AI_MODELS[0],
      setSelectedModel: (model) => set({ selectedModel: model }),
    }),
    {
      name: 'model-storage',
    }
  )
);
