import React, { createContext, useState, useContext } from 'react';

type Role = 'student' | 'lecturer' | 'admin' | null;

interface AuthContextProps {
  role: Role;
  setGlobalRole: (role: Role) => void;
  email: string | null;
  setGlobalEmail: (email: string | null) => void;
  user_id: number | null;
  setUserId: (user_id: number | null) => void;
}

const AuthContext = createContext<AuthContextProps>({
  role: null,
  setGlobalRole: () => {},
  email: null,
  setGlobalEmail: () => {},
  user_id: null,
  setUserId: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setGlobalRole] = useState<Role>(null);
  const [email, setGlobalEmail] = useState<string | null>(null);
  const [user_id, setUserId] = useState<number | null>(null);

  return (
    <AuthContext.Provider value={{ role, setGlobalRole, email, setGlobalEmail, user_id, setUserId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
