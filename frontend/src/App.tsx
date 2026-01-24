// App.tsx - Main application component with auth

import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/LoginPage';
import { getCurrentUser, logout } from './api/stockApi';
import type { User } from './types/stock';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    getCurrentUser()
      .then((authState) => {
        if (authState.authenticated && authState.user) {
          setUser(authState.user);
        }
      })
      .catch(() => {
        // Not logged in
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
