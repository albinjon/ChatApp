import * as React from "react";
import { trpc } from "./utils/trpc";
import { useQuery } from "@tanstack/react-query";

type User = {
  name: string;
  id: number;
};

export interface AuthContext {
  isAuthenticated: boolean;
  login: (username: string, password: string) => void;
  logout: () => Promise<void>;
  user: User | null;
  token: string | null;
}

const AuthContext = React.createContext<AuthContext | null>(null);

const idKey = "auth.user_id";
const nameKey = "auth.user_name";

function getStoredUser(): User | null {
  const name = localStorage.getItem(idKey);
  const id = localStorage.getItem(nameKey);
  if (!name || !id) {
    return null;
  }
  return {
    name,
    id: Number(id),
  };
}

function setStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem(idKey, user.id.toString());
    localStorage.setItem(nameKey, user.name);
  } else {
    localStorage.removeItem(idKey);
    localStorage.removeItem(nameKey);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(getStoredUser());
  const [token, setToken] = React.useState<string | null>(null);
  const isAuthenticated = !!user;

  const logout = React.useCallback(async () => {
    setStoredUser(null);
    setUser(null);
  }, []);

  const login = React.useCallback((username: string, password: string) => {
    const result = useQuery(trpc.login.queryOptions({ username, password }));
    if (result.error) throw new Error(result.error.message);
    const userId = result.data?.userId;
    if (!userId) throw new Error(`No User ID for ${username}`);
    setStoredUser({ id: userId, name: username });
    setUser({ id: userId, name: username });
    setToken(result.data?.token ?? null);
  }, []);

  React.useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
