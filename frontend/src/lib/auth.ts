import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface AuthUser {
  email: string;
}

let _cachedUser: AuthUser | null | undefined = undefined;

export function setAuthCache(user: AuthUser | null) {
  _cachedUser = user;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(_cachedUser ?? null);
  const [loading, setLoading] = useState(_cachedUser === undefined);

  useEffect(() => {
    if (_cachedUser !== undefined) {
      if (!_cachedUser) router.push("/login");
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        _cachedUser = data;
        setUser(data);
        if (!data) router.push("/login");
      })
      .catch(() => {
        _cachedUser = null;
        setUser(null);
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  return { user, loading };
}

export async function signout() {
  await fetch(`${API_BASE}/api/auth/signout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
  _cachedUser = undefined;
}
