import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, Zap, Clock, Sparkles, Plus } from 'lucide-react';
import { AI_MODELS } from '../config/models';
import { useModelStore } from '../store/modelStore';
import { CustomModelConfig } from './CustomModelConfig';

export function ModelSelector() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const { selectedModel, setSelectedModel } = useModelStore();

  const modelTypes = {
    versatile: {
      icon: Sparkles,
      color: 'text-purple-500 dark:text-purple-400'
    },
    chat: {
      icon: Brain,
      color: 'text-blue-500 dark:text-blue-400'
    },
    audio: {
      icon: Zap,
      color: 'text-yellow-500 dark:text-yellow-400'
    }
  };

  const formatContextLength = (length: number) => {
    return length >= 1000 ? `${length / 1000}K` : length;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600"
      >
        {selectedModel && (
          <div className={modelTypes[selectedModel.type].color}>
            {React.createElement(modelTypes[selectedModel.type].icon, { size: 20 })}
          </div>
        )}
        <span className="text-sm font-medium">Model: {selectedModel?.name}</span>
        <ChevronDown size={16} className="text-gray-500" />
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          <div 
            className="absolute top-full left-0 mt-2 w-80 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50"
          >
            <div className="p-2 space-y-1">
              {AI_MODELS.map(model => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    setShowDropdown(false);
                  }}
                  className={`
                    w-full px-3 py-2 rounded-lg
                    flex items-center space-x-3
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    text-left transition-colors
                    ${model.id === selectedModel?.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  `}
                >
                  <div className={modelTypes[model.type].color}>
                    {React.createElement(modelTypes[model.type].icon, { size: 20 })}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {model.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {model.description}
                    </p>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    <div className="flex items-center space-x-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <Zap size={14} className="text-yellow-500" />
                      <span>{model.performance}%</span>
                    </div>
                  </div>
                </button>
              ))}

              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                
              <button
                onClick={() => {
                  setShowDropdown(false);
                  setShowCustomConfig(true);
                }}
                className="w-full px-3 py-2 rounded-lg flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 dark:text-blue-400"
              >
                <Plus size={20} />
                <span>Configure Custom Model</span>
              </button>
            </div>
          </div>
        </>
      )}
      <CustomModelConfig 
        isOpen={showCustomConfig}
        onClose={() => setShowCustomConfig(false)}
      />
    </div>
  );
}
