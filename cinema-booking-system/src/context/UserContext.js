import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    let basic = null;
    if (storedUser) {
      // Seed context with whatever we have
      basic = JSON.parse(storedUser);
      setUser(basic);
    }

    // If we have a token, hydrate with full profile (first/last name, status, etc.)
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to fetch profile');
          return res.json();
        })
        .then((profile) => {
          // Merge to keep any client-side fields but prefer server truth
          setUser((prev) => ({ ...(prev || {}), ...profile }));
          const merged = { ...(basic || {}), ...profile };
          localStorage.setItem('user', JSON.stringify(merged));
        })
        .catch(() => {
          // Silently ignore; keep stored user
        });
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}
