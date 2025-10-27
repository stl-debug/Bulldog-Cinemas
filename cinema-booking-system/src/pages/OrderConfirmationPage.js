import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/OrderConfirmation.module.css';

function OrderConfirmationPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Order Confirmed!</h1>
        <p>Thank you for ordering your tickets with Bulldog Cinemas.</p>
        <p>Please check your email for your order confirmation.</p>
        <Link to="/" className={styles.homeLink}>Back to Home</Link>
      </div>
    </div>
  );
}

export default OrderConfirmationPage;
