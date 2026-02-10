import React, { createContext, ReactNode, useContext, useReducer } from 'react';

// App State Types
export interface AppState {
  currentScreen: string;
  user: User | null;
  projects: Project[];
  settings: AppSettings;
  dialogs: DialogState;
  loading: boolean;
  appLoaded: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  language: string;
  progress: number;
  lastModified: Date;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  language: string;
  fontSize: number;
  autoSave: boolean;
}

export interface DialogState {
  loading: boolean;
  export: boolean;
  import: boolean;
  settings: boolean;
  feedback: boolean;
}

// Actions
type AppAction =
  | { type: 'SET_SCREEN'; payload: string }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_DIALOG'; payload: { key: keyof DialogState; value: boolean } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_APP_LOADED'; payload: boolean };

// Initial State
const initialState: AppState = {
  currentScreen: 'home',
  user: null,
  projects: [],
  settings: {
    theme: 'light',
    language: 'en',
    fontSize: 14,
    autoSave: true,
  },
  dialogs: {
    loading: false,
    export: false,
    import: false,
    settings: false,
    feedback: false,
  },
  loading: false,
  appLoaded: false,
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p => (p.id === action.payload.id ? action.payload : p)),
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'SET_DIALOG':
      return {
        ...state,
        dialogs: { ...state.dialogs, [action.payload.key]: action.payload.value },
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_APP_LOADED':
      return { ...state, appLoaded: action.payload };
    default:
      return state;
  }
};

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Helper functions
  setScreen: (screen: string) => void;
  setUser: (user: User | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setDialog: (key: keyof DialogState, value: boolean) => void;
  setLoading: (loading: boolean) => void;
  setAppLoaded: (loaded: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const contextValue: AppContextType = {
    state,
    dispatch,
    setScreen: (screen: string) => dispatch({ type: 'SET_SCREEN', payload: screen }),
    setUser: (user: User | null) => dispatch({ type: 'SET_USER', payload: user }),
    addProject: (project: Project) => dispatch({ type: 'ADD_PROJECT', payload: project }),
    updateProject: (project: Project) => dispatch({ type: 'UPDATE_PROJECT', payload: project }),
    deleteProject: (projectId: string) => dispatch({ type: 'DELETE_PROJECT', payload: projectId }),
    updateSettings: (settings: Partial<AppSettings>) =>
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings }),
    setDialog: (key: keyof DialogState, value: boolean) =>
      dispatch({ type: 'SET_DIALOG', payload: { key, value } }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setAppLoaded: (loaded: boolean) => dispatch({ type: 'SET_APP_LOADED', payload: loaded }),
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// Hook to use the context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
