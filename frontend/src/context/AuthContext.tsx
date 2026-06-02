import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { socket } from '../socket';

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, tokenData: string) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (userData: User, tokenData: string) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    socket.connect();
    socket.emit('user_connected', userData.id);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socket.disconnect();
    window.location.href = '/';
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const isAuthenticated = !!token;

  useEffect(() => {
    if (isAuthenticated && user) {
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit('user_connected', user.id);
    }
  }, [isAuthenticated, user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
