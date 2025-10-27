import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import styles from '../styles/LoginPage.module.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, logout } = useContext(UserContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      logout();

      const res = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log('Login response:', data);

      if (res.ok) {
        const { token, user } = data;
        console.log('✅ User from backend:', user);

        
        localStorage.setItem('token',token);
        localStorage.setItem('role', user.role);
        localStorage.setItem('name', data.name);
        

       
        login(user);

        console.log('Redirecting based on role:', data.user.role);

        if (user.role === 'admin') {
          navigate('/admin-home');
        } else {
          const redirectPath = new URLSearchParams(window.location.search).get('redirect') || '/';
          navigate(redirectPath);
        }
      
      } else {
        setError(data.message || 'Invalid login credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h2 className={styles.title}>Login to Bulldog Cinemas</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}

          <label className={styles.label}>Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            placeholder="Enter your email"
            required
          />

          <label className={styles.label}>Password *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder="Enter your password"
            required
          />

          <button type="submit" className={styles.button}>
            Login
          </button>

          <div className={styles.links}>
            <Link to="/forgot-password" className={styles.link}>Forgot Password?</Link>
            <button
              type="button"
              className={styles.link}
              onClick={() => navigate('/signup')}
            >
              Create an Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
