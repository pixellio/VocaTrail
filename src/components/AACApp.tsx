'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit3, Trash2, X, Volume2, Grid, List, Sparkles, Store, Loader2, Save, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useDatabase } from '@/hooks/useDatabase';
import { useContextBoard } from '@/hooks/useContextBoard';
import { Card } from '@/types';
import { isTemporaryCard } from '@/lib/conceptToCard';

const AACApp = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const { isInitialized, isLoading, error, storageService } = useDatabase();
  const {
    contextBoard,
    isProcessing,
    error: contextError,
    interpretationSource,
    interpretPhrase,
    clearContextBoard,
    saveTemporaryCard,
    getSuggestions
  } = useContextBoard();
  
  const [sentence, setSentence] = useState<Card[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Context board UI state
  const [showContextInput, setShowContextInput] = useState(false);
  const [contextPhrase, setContextPhrase] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showContextBoard, setShowContextBoard] = useState(true);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showModels, setShowModels] = useState(false);

  // Ensure default Question cards exist even on non-empty DBs (UI-level enforcement).
  const ensuredQuestionDefaultsRef = useRef(false);
  
  const [newCard, setNewCard] = useState({
    text: '',
    symbol: '',
    category: 'General',
    color: '#F5F5F5'
  });

  const categories = ['All', ...new Set(cards.map(card => card.category))];
  const colors = ['#FFE4E1', '#E1F5FE', '#E8F5E8', '#E3F2FD', '#FFF3E0', '#FFEBEE', '#F3E5F5', '#E0F2F1'];
  
  // Filter suggestions based on input
  const suggestions = getSuggestions().filter(s => 
    contextPhrase && s.toLowerCase().includes(contextPhrase.toLowerCase())
  ).slice(0, 5);

  // Load cards from storage when storage is initialized
  useEffect(() => {
    const loadCards = async () => {
      if (!isInitialized || !storageService) return;

      try {
        const storedCards = await storageService.getAllCards();

        // UI-level: ensure WH-question cards always exist (add missing ones to DB)
        if (!ensuredQuestionDefaultsRef.current) {
          ensuredQuestionDefaultsRef.current = true;

          const questionDefaults: Omit<Card, 'id' | 'created_at' | 'updated_at'>[] = [
            { text: 'Who', symbol: '👤', category: 'Question', color: '#E3F2FD' },
            { text: 'What', symbol: '❓', category: 'Question', color: '#FFF3E0' },
            { text: 'Where', symbol: '📍', category: 'Question', color: '#E8F5E8' },
            { text: 'When', symbol: '🕙', category: 'Question', color: '#F3E5F5' },
            { text: 'Why', symbol: '🤷', category: 'Question', color: '#FFEBEE' },
            { text: 'How', symbol: '🔧', category: 'Question', color: '#E0F2F1' },
          ];

          const existingKey = new Set(
            storedCards.map((c) => `${c.category.toLowerCase()}::${c.text.toLowerCase()}`)
          );

          const missing = questionDefaults.filter(
            (c) => !existingKey.has(`${c.category.toLowerCase()}::${c.text.toLowerCase()}`)
          );

          if (missing.length > 0) {
            try {
              const saved = await Promise.all(missing.map((c) => storageService.addCard(c)));
              setCards([...storedCards, ...saved]);
              return;
            } catch (e) {
              console.warn('Failed to auto-add Question defaults, continuing with existing cards:', e);
            }
          }
        }

        setCards(storedCards);
      } catch (error) {
        console.error('Failed to load cards:', error);
        // Fallback to default cards if storage fails
        setCards([
          { id: 1, text: 'Hello', symbol: '👋', category: 'Greetings', color: '#FFE4E1' },
          { id: 2, text: 'Please', symbol: '🙏', category: 'Politeness', color: '#E1F5FE' },
          { id: 3, text: 'Thank you', symbol: '❤️', category: 'Politeness', color: '#E8F5E8' },
          { id: 4, text: 'Water', symbol: '💧', category: 'Needs', color: '#E3F2FD' },
          { id: 5, text: 'Food', symbol: '🍎', category: 'Needs', color: '#FFF3E0' },
          { id: 6, text: 'Help', symbol: '🆘', category: 'Emergency', color: '#FFEBEE' },
          { id: 7, text: 'Yes', symbol: '✅', category: 'Responses', color: '#E8F5E8' },
          { id: 8, text: 'No', symbol: '❌', category: 'Responses', color: '#FFEBEE' },
          // Questions (WH-)
          { id: 9, text: 'Who', symbol: '👤', category: 'Question', color: '#E3F2FD' },
          { id: 10, text: 'What', symbol: '❓', category: 'Question', color: '#FFF3E0' },
          { id: 11, text: 'Where', symbol: '📍', category: 'Question', color: '#E8F5E8' },
          { id: 12, text: 'When', symbol: '🕙', category: 'Question', color: '#F3E5F5' },
          { id: 13, text: 'Why', symbol: '🤷', category: 'Question', color: '#FFEBEE' },
          { id: 14, text: 'How', symbol: '🔧', category: 'Question', color: '#E0F2F1' },
        ]);
      }
    };

    loadCards();
  }, [isInitialized, storageService]);

  const filteredCards = selectedCategory === 'All' 
    ? cards 
    : cards.filter(card => card.category === selectedCategory);

  const addCardToSentence = (card: Card) => {
    setSentence(prev => [...prev, card]);
  };

  const removeFromSentence = (index: number) => {
    setSentence(prev => prev.filter((_, i) => i !== index));
  };

  const clearSentence = () => {
    setSentence([]);
  };

  const speakSentence = () => {
    const text = sentence.map(card => card.text).join(' ');
    if (text && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const handleAddCard = async () => {
    if (newCard.text.trim()) {
      try {
        if (storageService) {
          const savedCard = await storageService.addCard(newCard);
          setCards(prev => [...prev, savedCard]);
        } else {
          // Fallback to local state if storage not available
          const id = Math.max(...cards.map(c => c.id), 0) + 1;
          setCards(prev => [...prev, { ...newCard, id }]);
        }
        setNewCard({ text: '', symbol: '', category: 'General', color: '#F5F5F5' });
        setShowAddForm(false);
      } catch (error) {
        console.error('Failed to add card:', error);
        // Fallback to local state if storage fails
        const id = Math.max(...cards.map(c => c.id), 0) + 1;
        setCards(prev => [...prev, { ...newCard, id }]);
        setNewCard({ text: '', symbol: '', category: 'General', color: '#F5F5F5' });
        setShowAddForm(false);
      }
    }
  };

  const handleEditCard = (card: Card) => {
    setEditingCard({ ...card });
    setIsEditing(true);
  };

  const saveEditCard = async () => {
    if (editingCard) {
      try {
        if (storageService) {
          const updatedCard = await storageService.updateCard(editingCard.id, editingCard);
          if (updatedCard) {
            setCards(prev => prev.map(card => 
              card.id === editingCard.id ? updatedCard : card
            ));
          }
        } else {
          // Fallback to local state if storage not available
          setCards(prev => prev.map(card => 
            card.id === editingCard.id ? editingCard : card
          ));
        }
        setIsEditing(false);
        setEditingCard(null);
      } catch (error) {
        console.error('Failed to update card:', error);
        // Fallback to local state if storage fails
        setCards(prev => prev.map(card => 
          card.id === editingCard.id ? editingCard : card
        ));
        setIsEditing(false);
        setEditingCard(null);
      }
    }
  };

  const deleteCard = async (id: number) => {
    try {
      if (storageService) {
        await storageService.deleteCard(id);
      }
      setCards(prev => prev.filter(card => card.id !== id));
      setSentence(prev => prev.filter(card => card.id !== id));
    } catch (error) {
      console.error('Failed to delete card:', error);
      // Fallback to local state if storage fails
      setCards(prev => prev.filter(card => card.id !== id));
      setSentence(prev => prev.filter(card => card.id !== id));
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingCard(null);
  };

  // Context board handlers
  const handleInterpretPhrase = async () => {
    if (contextPhrase.trim()) {
      await interpretPhrase(contextPhrase, cards);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setContextPhrase(suggestion);
    setShowSuggestions(false);
  };

  const handleSaveTemporaryCard = async (card: Card) => {
    if (storageService && isTemporaryCard(card)) {
      const savedCard = await saveTemporaryCard(card, async (cardData) => {
        return await storageService.addCard(cardData);
      });
      if (savedCard) {
        setCards(prev => [...prev, savedCard]);
      }
    }
  };

  // Fetch available models
  const handleCheckModels = async () => {
    try {
      const response = await fetch('/api/list-models');
      const result = await response.json();
      
      if (result.success) {
        const models = Array.isArray(result?.data?.models)
          ? (result.data.models as Array<{ name: string }>)
          : [];
        const modelNames = models.map(m => m.name);
        setAvailableModels(modelNames);
        setShowModels(true);
        console.log('✅ Available models:', modelNames);
      } else {
        console.error('Failed to fetch models:', result.error);
        alert(`Failed to fetch models: ${result.error}`);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      alert('Error fetching models. Check console.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading communication cards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Database Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">The app will work with local storage only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Vocal Trail</h1>
            <p className="text-sm text-gray-500">AAC Communication</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowContextInput(!showContextInput)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                showContextInput ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Interpret promotional phrases"
            >
              <Sparkles size={20} />
              <span className="hidden sm:inline">AI Interpret</span>
            </button>
            <button
              onClick={handleCheckModels}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600"
              title="Check available Gemini models"
            >
              <span className="text-sm">🔍 Models</span>
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg hover:bg-gray-100"
              title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
            >
              {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
            </button>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Filter cards by category"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AI Context Interpreter Panel */}
      {showContextInput && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center space-x-2 mb-3 flex-col">
              <Store size={20} className="text-purple-600" />
              <h2 className="text-lg font-semibold text-purple-800">Location-based Context Interpreter</h2>
              <div className="flex flex-col space-y-2">
                <span className="text-sm text-purple-500">(Enter Grocey-store/Supermarket-based context phrases like &quot;buy one get one free&quot;)</span>
                <span className="text-sm text-purple-500">(Enter Hospital-based context phrases like &quot;Check the blood pressure before meeting the doctor&quot;)</span>
              </div>
            </div>
            
            <div className="relative">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={contextPhrase}
                    onChange={(e) => {
                      setContextPhrase(e.target.value);
                      setShowSuggestions(e.target.value.length > 0);
                    }}
                    onFocus={() => setShowSuggestions(contextPhrase.length > 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleInterpretPhrase();
                      }
                    }}
                    placeholder="e.g., buy one get one free, 50% off, 3 for 2..."
                    className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 placeholder-gray-500"
                  />
                  
                  {/* Autocomplete suggestions */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-purple-200 rounded-lg shadow-lg">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full px-4 py-2 text-left hover:bg-purple-50 text-gray-700 first:rounded-t-lg last:rounded-b-lg"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleInterpretPhrase}
                  disabled={isProcessing || !contextPhrase.trim()}
                  className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Sparkles size={20} />
                  )}
                  <span>Interpret</span>
                </button>
              </div>
              
              {contextError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {contextError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Context Board Display */}
      {contextBoard && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowContextBoard(!showContextBoard)}
                  className="p-1 hover:bg-amber-100 rounded"
                >
                  {showContextBoard ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <h2 className="text-lg font-semibold text-amber-800">
                  📋 {contextBoard.name}
                </h2>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  interpretationSource === 'library' 
                    ? 'bg-green-100 text-green-700'
                    : interpretationSource === 'gemini'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {interpretationSource === 'library' ? '✓ Matched' : 
                   interpretationSource === 'gemini' ? '🤖 AI' : '⚡ Quick'}
                </span>
              </div>
              <button
                onClick={clearContextBoard}
                className="text-amber-600 hover:text-amber-800 flex items-center space-x-1"
              >
                <X size={16} />
                <span>Close</span>
              </button>
            </div>
            
            {showContextBoard && (
              <>
                {/* Interpretation info */}
                <div className="mb-3 flex items-center space-x-4 text-sm text-amber-700">
                  <div className="flex items-center space-x-1">
                    <Info size={14} />
                    <span>Phrase: &quot;{contextBoard.phrase}&quot;</span>
                  </div>
                  <span>•</span>
                  <span>Confidence: {Math.round(contextBoard.interpretation.confidence * 100)}%</span>
                </div>
                
                {/* Context Cards Grid */}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {contextBoard.cards.map(card => (
                    <div
                      key={`ctx-${card.id}`}
                      className={`relative group aspect-square p-3 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer ${
                        isTemporaryCard(card) ? 'ring-2 ring-dashed ring-amber-400' : ''
                      }`}
                      style={{ backgroundColor: card.color }}
                      onClick={() => addCardToSentence(card)}
                      title={`Add "${card.text}" to your message`}
                    >
                      {/* Temporary card indicator */}
                      {isTemporaryCard(card) && (
                        <div className="absolute top-1 left-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          New
                        </div>
                      )}
                      
                      {/* Card content */}
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-2xl mb-1">{card.symbol}</span>
                        <span className="font-medium text-center text-gray-800 text-sm">
                          {card.text}
                        </span>
                      </div>
                      
                      {/* Save temporary card button */}
                      {isTemporaryCard(card) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveTemporaryCard(card);
                          }}
                          className="absolute bottom-1 right-1 p-1.5 bg-green-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-600"
                          title="Save to my vocabulary"
                        >
                          <Save size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Concepts breakdown */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {contextBoard.interpretation.concepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-white bg-opacity-60 rounded-full text-amber-800 border border-amber-200"
                    >
                      {concept.type}: {String(concept.value)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sentence Builder */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700">Build Your Message</h2>
            <div className="flex space-x-2">
              <button
                onClick={speakSentence}
                disabled={sentence.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Speak the current message aloud"
              >
                <Volume2 size={16} />
                <span>Speak</span>
              </button>
              <button
                onClick={clearSentence}
                disabled={sentence.length === 0}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear the current message"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="min-h-16 p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            {sentence.length === 0 ? (
              <p className="text-gray-500 text-center">Tap cards to build your message</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sentence.map((card, index) => (
                  <button
                    key={`${card.id}-${index}`}
                    onClick={() => removeFromSentence(index)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg hover:opacity-80 transition-opacity ${
                      isTemporaryCard(card) ? 'ring-2 ring-dashed ring-amber-400' : ''
                    }`}
                    style={{ backgroundColor: card.color }}
                  >
                    <span className="text-2xl">{card.symbol}</span>
                    <span className="font-medium text-gray-800">{card.text}</span>
                    <X size={14} className="text-gray-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        {/* Add New Card Button */}
        <div className="mb-6 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">Communication Cards</h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            title="Add a new communication card"
          >
            <Plus size={16} />
            <span>Add Card</span>
          </button>
        </div>

        {/* Add Card Form */}
        {showAddForm && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md border">
            <h4 className="text-lg font-medium mb-4">Add New Card</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Text"
                value={newCard.text}
                onChange={(e) => setNewCard(prev => ({ ...prev, text: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
              />
              <input
                type="text"
                placeholder="Symbol (emoji)"
                value={newCard.symbol}
                onChange={(e) => setNewCard(prev => ({ ...prev, symbol: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
              />
              <input
                type="text"
                placeholder="Category"
                value={newCard.category}
                onChange={(e) => setNewCard(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
              />
              <select
                value={newCard.color}
                onChange={(e) => setNewCard(prev => ({ ...prev, color: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              >
                {colors.map(color => (
                  <option key={color} value={color} style={{ backgroundColor: color }}>
                    {color}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Cancel adding new card"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCard}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                title="Add the new card to your collection"
              >
                Add Card
              </button>
            </div>
          </div>
        )}

        {/* Cards Grid/List */}
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' 
          : 'space-y-2'
        }>
          {filteredCards.map(card => (
            <div
              key={card.id}
              className={`relative group ${viewMode === 'list' ? 'flex items-center p-3' : 'aspect-square p-4'} 
                         rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
              style={{ backgroundColor: card.color }}
            >
              {/* Card Content */}
              <div 
                className={`${viewMode === 'list' ? 'flex items-center space-x-3 flex-1' : 'flex flex-col items-center justify-center h-full'}`}
                onClick={() => addCardToSentence(card)}
                title={`Add "${card.text}" to your message`}
              >
                <span className={`${viewMode === 'list' ? 'text-2xl' : 'text-3xl mb-2'}`}>
                  {card.symbol}
                </span>
                <span className={`font-medium text-center text-gray-800 ${viewMode === 'list' ? 'text-base' : 'text-sm'}`}>
                  {card.text}
                </span>
                {viewMode === 'list' && (
                  <span className="text-xs text-gray-500 ml-auto">{card.category}</span>
                )}
              </div>

              {/* Edit Controls */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCard(card);
                    }}
                    className="p-1 bg-white bg-opacity-80 rounded hover:bg-opacity-100"
                    title="Edit this card"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCard(card.id);
                    }}
                    className="p-1 bg-white bg-opacity-80 rounded hover:bg-opacity-100 text-red-500"
                    title="Delete this card"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && editingCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit Card</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Text"
                value={editingCard.text}
                onChange={(e) => setEditingCard(prev => prev ? ({ ...prev, text: e.target.value }) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
              />
              <input
                type="text"
                placeholder="Symbol (emoji)"
                value={editingCard.symbol}
                onChange={(e) => setEditingCard(prev => prev ? ({ ...prev, symbol: e.target.value }) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
              />
              <input
                type="text"
                placeholder="Category"
                value={editingCard.category}
                onChange={(e) => setEditingCard(prev => prev ? ({ ...prev, category: e.target.value }) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
              />
              <select
                value={editingCard.color}
                onChange={(e) => setEditingCard(prev => prev ? ({ ...prev, color: e.target.value }) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              >
                {colors.map(color => (
                  <option key={color} value={color} style={{ backgroundColor: color }}>
                    {color}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Cancel editing and discard changes"
              >
                Cancel
              </button>
              <button
                onClick={saveEditCard}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                title="Save the changes to this card"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Models List Modal */}
      {showModels && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Available Gemini Models</h3>
              <button
                onClick={() => setShowModels(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            {availableModels.length === 0 ? (
              <p className="text-gray-500">No models found. Check your terminal for errors.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">
                  Found {availableModels.length} model(s) available for your API key:
                </p>
                {availableModels.map((modelName, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 rounded border border-gray-200 font-mono text-sm"
                  >
                    {modelName}
                  </div>
                ))}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  <strong>Note:</strong> Check your terminal for detailed information about each model,
                  including supported methods and token limits.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AACApp;
