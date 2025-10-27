// src/pages/RegistrationPage.js
import React, { useState } from 'react';
import styles from '../styles/ResistrationPage.module.css';

export default function RegistrationPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    password:  '',
    confirmPassword: '',
    phone:     '',
    promoOptIn: false,
    company:   '' // honeypot (should remain empty)
  });
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
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
    if (form.company.trim()) return 'Invalid submission.'; // honeypot caught
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) return setMsg({ type: 'error', text: v });
    setLoading(true);
    await new Promise(r => setTimeout(r, 500)); // demo latency only
    setForm(p => ({ ...p, password: '', confirmPassword: '' }));
    setLoading(false);
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

        <label className={styles.label} htmlFor="phone">Phone (optional)</label>
        <input
          className={styles.input}
          id="phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={onChange}
          placeholder="(404) 555-1234"
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
        <div className={styles.helper}>At least 8 characters and include letters & numbers.</div>

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

        {/* Honeypot (hidden) */}
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="company">Company</label>
          <input
            id="company"
            name="company"
            value={form.company}
            onChange={onChange}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

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
            onChange={() => setAgree(a => !a)}
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