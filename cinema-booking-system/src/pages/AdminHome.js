import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/AdminHome.module.css';

function AdminHome() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  // Redirect if not admin
  if (role !== 'admin') {
    navigate('/home');
    return null;
  }


  return (
    <div className={styles.container}>

      <div className={styles.content}>
        <h1 className={styles.title}>Admin Dashboard</h1>

        <div className={styles.buttonGrid}>
          <button className={styles.actionBtn}>Manage Movies</button>
          <button className={styles.actionBtn}>Manage Members</button>
          <button className={styles.actionBtn}>Manage Administrators</button>
          <button className={styles.actionBtn}>Manage Promotions</button>
        </div>
      </div>
    </div>
  );
}

export default AdminHome;
