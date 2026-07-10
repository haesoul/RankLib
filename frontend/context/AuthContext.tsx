import { checkToken } from '@/services/API/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({
  isAuth: false,
  setIsAuth: (value: boolean) => {},
  loading: true
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized) return;
    checkToken().then(isValid => {
      setIsAuth(isValid);
      setLoading(false);
      setInitialized(true);
    });
    console.log(isAuth)
  }, [initialized]);

  return (
    <AuthContext.Provider value={{ isAuth, setIsAuth, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук для удобного использования в любом месте
export const useAuth = () => useContext(AuthContext);