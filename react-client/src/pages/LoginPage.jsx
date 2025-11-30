import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function LoginPage() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/user', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.logged_in) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function startLogin() {
    // Redirect to backend OAuth start endpoint
    window.location.href = 'http://localhost:5000/login';
  }

  function doLogout() {
    // backend handles clearing session and redirects back
    window.location.href = 'http://localhost:5000/logout';
  }

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
      <h2>{t('nav.login') || 'Login'}</h2>

      {loading ? (
        <p>Loading…</p>
      ) : user ? (
        <div>
          <p>
            <strong>{user.name || user.email || user.login}</strong>
          </p>
          {user.picture && <img src={user.picture} alt="avatar" style={{ width: 80, borderRadius: 8 }} />}
          <p style={{ marginTop: 12 }}>
            <button onClick={() => navigate('/')}>Go Home</button>
            <button onClick={doLogout} style={{ marginLeft: 12 }}>Logout</button>
          </p>
        </div>
      ) : (
        <div>
          <p>To continue please sign in with Google.</p>
          <button onClick={startLogin} style={{ padding: '8px 16px', fontSize: 16 }}>
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
}
