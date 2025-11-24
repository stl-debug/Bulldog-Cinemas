import React, { useState } from 'react';
import styles from '../styles/ForgotPasswordPage.module.css';


function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setMessage(res.ok ? 'Password reset link sent! Check your email.' : data.error);
  };

  return (
    <div>
      <div className={styles.container}>
        <div className={styles.card}>
          <h2>Forgot Password</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">Send Reset Link</button>
          </form>

          {message && <p className={styles.message}>{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
