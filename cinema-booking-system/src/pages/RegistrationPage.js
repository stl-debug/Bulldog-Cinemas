// src/pages/RegistrationPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/RegistrationPage.module.css';

// Works in Vite or CRA; falls back to local backend server
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  'http://localhost:5001';

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    promoOptIn: false,
  });
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    if (msg.text) setMsg({ type: '', text: '' });
  };

  const validate = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return 'First and last name are required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Please enter a valid email.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      return 'Password must be 8+ characters and include letters & numbers.';
    }
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (!agree) return 'You must agree to the terms.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) return setMsg({ type: 'error', text: v });

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Your backend expects: firstName, lastName, email, password, promotions
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          promotions: !!form.promoOptIn,
        }),
      });

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        console.error('Registration error:', data);
        setMsg({ type: 'error', text: data.error || data.message || `Registration failed: ${res.status} ${res.statusText}` });
      } else {
        // Account created in MongoDB as inactive, redirect to home
        console.log('Registration successful');
        navigate('/');
      }
    } catch (err) {
      console.error('Network error:', err);
      setMsg({ type: 'error', text: `Network error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Create your account</h2>

      {msg.text && (
        <div className={msg.type === 'error' ? styles.alertError : styles.alertSuccess}>
          {msg.text}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.row}>
          <div className={styles.col}>
            <label className={styles.label} htmlFor="firstName">First name *</label>
            <input
              className={styles.input}
              id="firstName"
              name="firstName"
              value={form.firstName}
              onChange={onChange}
              required
            />
          </div>
          <div className={styles.col}>
            <label className={styles.label} htmlFor="lastName">Last name *</label>
            <input
              className={styles.input}
              id="lastName"
              name="lastName"
              value={form.lastName}
              onChange={onChange}
              required
            />
          </div>
        </div>

        <label className={styles.label} htmlFor="email">Email *</label>
        <input
          className={styles.input}
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          required
        />

        <label className={styles.label} htmlFor="password">Password *</label>
        <input
          className={styles.input}
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          minLength={8}
          required
        />
        <div className={styles.helper}>At least 8 characters and include letters &amp; numbers.</div>

        <label className={styles.label} htmlFor="confirmPassword">Confirm password *</label>
        <input
          className={styles.input}
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={onChange}
          minLength={8}
          required
        />

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            name="promoOptIn"
            checked={form.promoOptIn}
            onChange={onChange}
          />
          <span>Sign me up for promotions and special offers</span>
        </label>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={agree}
            onChange={() => setAgree((a) => !a)}
            required
          />
          <span>I agree to the Terms and Privacy Policy</span>
        </label>

        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}