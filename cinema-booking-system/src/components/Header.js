import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import styles from '../styles/Header.module.css';

function Header() {
  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    localStorage.clear();
    navigate('/login');
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.logo}>BULLDOG CINEMAS</div>
        <nav className={styles.navbar}>
          {user?.role !== 'admin' && (
            <>
              <Link to="/" className={styles.navLink}>Home</Link>
              <Link to="/search" className={styles.navLink}>Search Movies</Link>
            </>
          )}

          {user ? (
            <>
              <Link to="/profile" className={styles.navLink}>Profile</Link>
              <span onClick={handleLogout} className={styles.navLink} style={{ cursor: 'pointer' }}> Logout </span>
              <span className={styles.welcome}>
                Welcome, {user.firstName || user.email}
              </span>
            </>
          ) : (
            <Link to="/login" className={styles.navLink}>Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
