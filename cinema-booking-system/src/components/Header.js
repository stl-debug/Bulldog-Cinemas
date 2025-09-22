import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Header.module.css';

function Header() {
    return (
        <header className={styles.header}>
            <div className={styles.logo}>BULLDOG CINEMAS</div>
            <nav className={styles.navbar}>
                <Link to="/" className={styles.navLink}>Home</Link>
                <Link to="/search" className={styles.navLink}>Search Movies</Link>
                <Link to="/login" className={styles.navLink}>Login</Link>
            </nav>
        </header>
    );
}

export default Header;
