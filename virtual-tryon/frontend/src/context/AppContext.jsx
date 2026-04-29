import React, { createContext, useContext, useReducer } from 'react';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

const loadSavedLooks = () => {
  try {
    const raw = localStorage.getItem('savedLooks')
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

const initialState = {
  currentAnalysis: null,
  savedLooks: loadSavedLooks(),
  tryOnImage: null
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CURRENT_ANALYSIS':
      return { ...state, currentAnalysis: action.payload };
    case 'CLEAR_ANALYSIS':
      return { ...state, currentAnalysis: null };
    case 'SET_TRY_ON_IMAGE':
      return { ...state, tryOnImage: action.payload };
    case 'ADD_SAVED_LOOK':
      return { ...state, savedLooks: [action.payload, ...state.savedLooks] };
    case 'REMOVE_SAVED_LOOK':
      return { ...state, savedLooks: state.savedLooks.filter(s => s.id !== action.payload) };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setCurrentAnalysis = (analysis) => {
    dispatch({ type: 'SET_CURRENT_ANALYSIS', payload: analysis });
  };

  const clearAnalysis = () => {
    dispatch({ type: 'CLEAR_ANALYSIS' });
  };

  const setTryOnImage = (imageSrc) => {
    dispatch({ type: 'SET_TRY_ON_IMAGE', payload: imageSrc });
  };

    const addSavedLook = (item) => {
      dispatch({ type: 'ADD_SAVED_LOOK', payload: item });
      try {
        const next = [item, ...state.savedLooks];
        localStorage.setItem('savedLooks', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
    };

    const removeSavedLook = (id) => {
      dispatch({ type: 'REMOVE_SAVED_LOOK', payload: id });
      try {
        const next = state.savedLooks.filter(s => s.id !== id);
        localStorage.setItem('savedLooks', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
    };

  const value = {
    state,
    setCurrentAnalysis,
    clearAnalysis,
    setTryOnImage
    , addSavedLook, removeSavedLook
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
