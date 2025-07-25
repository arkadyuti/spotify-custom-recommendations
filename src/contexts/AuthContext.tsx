import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService, type AuthResponse, type UserProfile, type DataSummary } from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  profile: UserProfile | null;
  dataSummary: DataSummary | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  collectData: (forceRefresh?: boolean) => Promise<void>;
  refreshDataSummary: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    profile: null,
    dataSummary: null,
    loading: true,
    error: null,
  });

  const setError = (error: string | null) => {
    setAuthState(prev => ({ ...prev, error }));
  };

  const setLoading = (loading: boolean) => {
    setAuthState(prev => ({ ...prev, loading }));
  };

  const refreshAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      const authResponse = await apiService.getAuthStatus();
      
      let profile: UserProfile | null = null;
      let dataSummary: DataSummary | null = null;

      if (authResponse.isAuthenticated) {
        try {
          // Get user profile
          const profileResponse = await apiService.testAuth();
          profile = profileResponse.profile;

          // Get data summary
          dataSummary = await apiService.getUserSummary();
        } catch (error) {
          console.warn('Could not fetch profile or data summary:', error);
          // Don't set error here as auth is still valid
        }
      }

      setAuthState(prev => ({
        ...prev,
        isAuthenticated: authResponse.isAuthenticated,
        userId: authResponse.userId,
        profile,
        dataSummary,
        loading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        userId: null,
        profile: null,
        dataSummary: null,
        loading: false,
        error: 'Failed to check authentication status',
      }));
    }
  };

  const login = async () => {
    try {
      setError(null);
      await apiService.login();
      // The login method redirects to Spotify, so we don't need to update state here
    } catch (error) {
      console.error('Login failed:', error);
      setError('Login failed');
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await apiService.logout();
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        userId: null,
        profile: null,
        dataSummary: null,
      }));
    } catch (error) {
      console.error('Logout failed:', error);
      setError('Logout failed');
    }
  };

  const collectData = async (forceRefresh: boolean = false) => {
    try {
      setError(null);
      const response = await apiService.collectUserData(forceRefresh);
      
      // Update profile if we got new data
      if (response.profile) {
        setAuthState(prev => ({
          ...prev,
          profile: response.profile,
        }));
      }

      // Refresh data summary after collection
      await refreshDataSummary();
    } catch (error) {
      console.error('Data collection failed:', error);
      setError('Failed to collect user data');
      throw error;
    }
  };

  const refreshDataSummary = async () => {
    try {
      const dataSummary = await apiService.getUserSummary();
      setAuthState(prev => ({
        ...prev,
        dataSummary,
      }));
    } catch (error) {
      console.warn('Could not refresh data summary:', error);
      // Don't throw here as this is not critical
    }
  };

  // Check auth status on mount
  useEffect(() => {
    refreshAuth();
  }, []);

  // Check auth status when returning to the tab/window
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && authState.isAuthenticated) {
        refreshAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authState.isAuthenticated]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshAuth,
    collectData,
    refreshDataSummary,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};