import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";

interface User { id: number; name: string; email: string }
interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("rm_token");
    if (t) bootstrap(t);
    else setLoading(false);
  }, []);

  async function bootstrap(t: string) {
    try {
      const res = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      setToken(t);
      setUser(res.data);
    } catch {
      localStorage.removeItem("rm_token");
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await axios.post("/api/auth/login", { email, password });
    const t = res.data.access_token;
    localStorage.setItem("rm_token", t);
    await bootstrap(t);
  }

  async function register(name: string, email: string, password: string) {
    const res = await axios.post("/api/auth/register", { name, email, password });
    const t = res.data.access_token;
    localStorage.setItem("rm_token", t);
    await bootstrap(t);
  }

  function logout() {
    localStorage.removeItem("rm_token");
    setToken(null);
    setUser(null);
  }

  return <Ctx.Provider value={{ user, token, login, register, logout, loading }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
