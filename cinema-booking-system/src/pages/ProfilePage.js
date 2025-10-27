// src/pages/ProfilePage.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/LoginPage.module.css';

/**
 * ProfilePage (read-only)
 * DB-ready version:
 *  - Loads profile from GET /api/profile/me (credentials included)
 *  - Expects JSON shape documented below
 *  - Handles 401 by redirecting to /login
 *  - No localStorage mock usage
 *
 * Expected response shape (example):
 * {
 *   "firstName": "Alex",
 *   "lastName": "Johnson",
 *   "email": "alex@example.com",        // read-only
 *   "phone": "(555) 123-9876",
 *   "promoOptIn": true,                 // boolean
 *   "status": "Active",                 // "Active" | "Inactive"
 *   "address": {                        // optional, only 0 or 1 address stored
 *     "line1": "123 Main St",
 *     "line2": "Apt 4B",
 *     "city": "Athens",
 *     "state": "GA",
 *     "zip": "30602",
 *     "country": "USA"
 *   },
 *   "cards": [                          // array length 0..4
 *     { "brand": "Visa", "last4": "4242", "expMonth": 12, "expYear": 27 }
 *   ]
 * }
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Use REACT_APP_API_URL if provided; otherwise same-origin
  const API_BASE = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL : '';

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE}/api/profile/me`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });

        if (res.status === 401) {
          // Not authenticated → redirect to login
          navigate('/login');
          return;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Failed to load profile (HTTP ${res.status}).`);
        }

        const data = await res.json();
        if (!isMounted) return;

        // Defensive mapping to avoid undefined access
        setUser({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          promoOptIn: !!data.promoOptIn,
          status: data.status ?? '',
          address: data.address ?? null,
          cards: Array.isArray(data.cards) ? data.cards.slice(0, 4) : []
        });
      } catch (e) {
        if (!isMounted) return;
        setError(e?.message || 'Unable to load profile.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => { isMounted = false; };
  }, [API_BASE, navigate]);

  const formatAddress = (addr) => {
    if (!addr) return [];
    const cityLine = [addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
    return [addr.line1, addr.line2, cityLine, addr.country].filter(Boolean);
  };

  if (loading) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h2 className={styles.title}>Profile</h2>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h2 className={styles.title}>Profile</h2>
          <p className={styles.error}>{error}</p>
          <button className={styles.button} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h2 className={styles.title}>Profile</h2>
          <p>No profile data available.</p>
          <button className={styles.button} onClick={() => navigate('/signup')}>Create Account</button>
        </div>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const addressLines = formatAddress(user.address);

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h2 className={styles.title}>Your Profile</h2>

        {/* Account section */}
        <section style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>Account</h3>
          <div><strong>Name:</strong> {fullName || '—'}</div>
          <div><strong>Email (read-only):</strong> {user.email || '—'}</div>
          <div><strong>Status:</strong> {user.status || '—'}</div>
        </section>

        {/* Contact section */}
        <section style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>Contact</h3>
          <div><strong>Phone:</strong> {user.phone || '—'}</div>
        </section>

        {/* Preferences */}
        <section style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>Preferences</h3>
          <div>
            <strong>Promotions:</strong> {user.promoOptIn ? 'Registered' : 'Not registered'}
          </div>
        </section>

        {/* Billing Address */}
        <section style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>Billing Address</h3>
          {addressLines.length > 0 ? (
            <div>
              {addressLines.map((ln, idx) => (
                <div key={idx}>{ln}</div>
              ))}
            </div>
          ) : (
            <div>None on file</div>
          )}
        </section>

        {/* Payment Methods */}
        <section style={{ marginBottom: 8 }}>
          <h3 style={{ margin: '0 0 8px' }}>Payment Methods</h3>
          {Array.isArray(user.cards) && user.cards.length > 0 ? (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {user.cards.map((c, i) => (
                <li key={i}>
                  {c.brand || 'Card'} •••• {c.last4 || '0000'} (exp {c.expMonth || 'MM'}/{c.expYear || 'YY'})
                </li>
              ))}
            </ul>
          ) : (
            <div>No saved cards</div>
          )}
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
            You can store up to <strong>4</strong> payment cards.
          </div>
        </section>

        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <button
            className={styles.button}
            type="button"
            onClick={() => navigate('/profile/edit')}
          >
            Edit Profile
          </button>
          <button
            className={styles.button}
            type="button"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}