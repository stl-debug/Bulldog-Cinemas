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
  const API_BASE = process.env.REACT_APP_API_URL || '';

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
          navigate('/login');
          return;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Failed to load profile (HTTP ${res.status}).`);
        }

        const data = await res.json();
        if (!isMounted) return;


        setUser({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          email: data.email ?? '',
          status: data.status ?? ''
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