import React, { createContext, useContext, useReducer } from 'react';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

const initialState = {
  currentAnalysis: null,
  savedLooks: [],
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

  const value = {
    state,
    setCurrentAnalysis,
    clearAnalysis,
    setTryOnImage
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
