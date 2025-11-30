import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddMovie from '../components/AddMovie';
import RemoveMovie from '../components/RemoveMovie';
import AddShowtime from '../components/AddShowtime';
import RemoveShowtime from '../components/RemoveShowtime';
import AddPromotion from '../components/AddPromotion';
import RemovePromotion from '../components/RemovePromotion';
import SendPromotion from '../components/SendPromotion';
import styles from '../styles/AdminHome.module.css';

function AdminHome() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const [showMoviesForm, setShowMoviesForm] = useState(false);
  const [showShowtimeForm, setShowShowtimeForm] = useState(false);
  const [showPromotionsForm, setShowPromotionsForm] = useState(false);
  const [movieMode, setMovieMode] = useState(null); // 'add' or 'remove'
  const [showtimeMode, setShowtimeMode] = useState(null); // 'add' or 'remove'
  const [promotionMode, setPromotionMode] = useState(null); // 'create', 'send', or 'remove'

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
          <button 
            className={styles.actionBtn}
            onClick={() => {
              setShowMoviesForm(!showMoviesForm);
              setShowShowtimeForm(false);
              setShowPromotionsForm(false);
              setMovieMode(null);
              setShowtimeMode(null);
              setPromotionMode(null);
            }}
          >
            Manage Movies
          </button>
          <button 
            className={styles.actionBtn}
            onClick={() => {
              setShowShowtimeForm(!showShowtimeForm);
              setShowMoviesForm(false);
              setShowPromotionsForm(false);
              setMovieMode(null);
              setShowtimeMode(null);
              setPromotionMode(null);
            }}
          >
            Manage Showtimes
          </button>
          <button 
            className={styles.actionBtn}
            onClick={() => {
              setShowPromotionsForm(!showPromotionsForm);
              setShowMoviesForm(false);
              setShowShowtimeForm(false);
              setMovieMode(null);
              setShowtimeMode(null);
              if (!showPromotionsForm) {
                setPromotionMode(null);
              }
            }}
          >
            Manage Promotions
          </button>
        </div>

        {showMoviesForm && (
          <div className={styles.formContainer}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                className={styles.actionBtn}
                onClick={() => setMovieMode('add')}
                style={{ flex: 1 }}
              >
                Add Movie
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => setMovieMode('remove')}
                style={{ flex: 1 }}
              >
                Remove Movie
              </button>
            </div>
            {movieMode === 'add' && <AddMovie />}
            {movieMode === 'remove' && <RemoveMovie />}
          </div>
        )}

        {showShowtimeForm && (
          <div className={styles.formContainer}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                className={styles.actionBtn}
                onClick={() => setShowtimeMode('add')}
                style={{ flex: 1 }}
              >
                Add Showtime
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => setShowtimeMode('remove')}
                style={{ flex: 1 }}
              >
                Remove Showtime
              </button>
            </div>
            {showtimeMode === 'add' && <AddShowtime />}
            {showtimeMode === 'remove' && <RemoveShowtime />}
          </div>
        )}

        {showPromotionsForm && (
          <div className={styles.formContainer}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                className={styles.actionBtn}
                onClick={() => setPromotionMode('create')}
                style={{ flex: 1 }}
              >
                Create Promotion
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => setPromotionMode('send')}
                style={{ flex: 1 }}
              >
                Send Promotion
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => setPromotionMode('remove')}
                style={{ flex: 1 }}
              >
                Remove Promotion
              </button>
            </div>
            {promotionMode === 'create' && <AddPromotion />}
            {promotionMode === 'send' && <SendPromotion />}
            {promotionMode === 'remove' && <RemovePromotion />}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminHome;
