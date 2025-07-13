import * as React from "react";
import { trpc } from "./utils/trpc";
import { useMutation } from "@tanstack/react-query";

type User = {
  name: string;
  id: number;
};

export interface AuthContext {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  user: User | null;
  token: string | null;
}

const AuthContext = React.createContext<AuthContext | null>(null);

const idKey = "auth.user_id";
const nameKey = "auth.user_name";
const tokenKey = "auth.token";

function getStoredUser(): User | null {
  const name = localStorage.getItem(nameKey);
  const id = localStorage.getItem(idKey);
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

function getStoredToken(): string | null {
  return localStorage.getItem(tokenKey);
}

function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(tokenKey, token);
  } else {
    localStorage.removeItem(tokenKey);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(getStoredUser());
  const [token, setToken] = React.useState<string | null>(getStoredToken());
  const isAuthenticated = !!user;

  const logout = React.useCallback(async () => {
    setStoredUser(null);
    setStoredToken(null);
    setUser(null);
    setToken(null);
  }, []);

  const loginMutation = useMutation(trpc.login.mutationOptions());

  const login = React.useCallback(
    async (username: string, password: string) => {
      try {
        const result = await loginMutation.mutateAsync({ username, password });
        console.log(username, password);
        const { userId, token } = result;
        console.log(token);
        if (!userId || !token) {
          throw new Error(`No User ID or token for ${username}`);
        }
        setUser({ id: userId, name: username });
        setToken(token);
        setStoredUser({ id: userId, name: username });
        setStoredToken(token);
      } catch (error) {
        // INFO: Re-throw to let the component handle the error
        throw error;
      }
    },
    [loginMutation],
  );

  React.useEffect(() => {
    setUser(getStoredUser());
    setToken(getStoredToken());
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
