import React, { useState, useEffect } from 'react';
import styles from '../styles/AdminHome.module.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function AddShowtime() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [movies, setMovies] = useState([]);
  const [existingShowtimes, setExistingShowtimes] = useState([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);

  const [showtimeForm, setShowtimeForm] = useState({
    movie: '',
    showroom: '',
    startTime: ''
  });

  useEffect(() => {
    loadMovies();
  }, []);

  useEffect(() => {
    if (showtimeForm.movie) {
      loadShowtimes(showtimeForm.movie);
    } else {
      setExistingShowtimes([]);
    }
  }, [showtimeForm.movie]);

  const loadMovies = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/movies`);
      if (res.ok) {
        const data = await res.json();
        setMovies(data);
      }
    } catch (err) {
      console.error('Failed to load movies:', err);
    }
  };

  const loadShowtimes = async (movieId) => {
    try {
      setLoadingShowtimes(true);
      const res = await fetch(`${API_BASE}/api/showtimes/${movieId}`);
      if (res.ok) {
        const data = await res.json();
        setExistingShowtimes(data);
      } else {
        setExistingShowtimes([]);
      }
    } catch (err) {
      console.error('Failed to load showtimes:', err);
      setExistingShowtimes([]);
    } finally {
      setLoadingShowtimes(false);
    }
  };

  const formatShowtime = (showtime) => {
    const date = new Date(showtime.startTime || showtime.date);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShowtimeForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      if (!showtimeForm.movie) {
        throw new Error('Please select a movie');
      }
      if (!showtimeForm.showroom) {
        throw new Error('Please enter a showroom');
      }
      if (!showtimeForm.startTime) {
        throw new Error('Please enter a start time');
      }

      const showtimeData = {
        movieID: showtimeForm.movie,
        showroom: showtimeForm.showroom,
        startTime: new Date(showtimeForm.startTime).toISOString(),
        date: new Date(showtimeForm.startTime).toISOString(),
        capacity: 100,
        layoutVersion: 1
      };

      const res = await fetch(`${API_BASE}/api/showtimes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(showtimeData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create showtime');
      }

      setMessage({ type: 'success', text: 'Showtime created successfully!' });
      // Reload showtimes after successful creation
      if (showtimeForm.movie) {
        loadShowtimes(showtimeForm.movie);
      }
      setShowtimeForm({
        movie: showtimeForm.movie, // Keep the movie selected
        showroom: '',
        startTime: ''
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Add New Showtime</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          Movie *
          <select
            name="movie"
            value={showtimeForm.movie}
            onChange={handleInputChange}
            className={styles.input}
            required
          >
            <option value="">Select a movie</option>
            {movies.map((movie) => (
              <option key={movie._id} value={movie._id}>
                {movie.title}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Showroom *
          <input
            type="text"
            name="showroom"
            value={showtimeForm.showroom}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Auditorium 1"
            required
          />
        </label>

        <label className={styles.label}>
          Start Time *
          <input
            type="datetime-local"
            name="startTime"
            value={showtimeForm.startTime}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </label>

        {showtimeForm.movie && (
          <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '16px', fontWeight: 'bold' }}>
              Existing Showtimes for this Movie:
            </h3>
            {loadingShowtimes ? (
              <p>Loading showtimes...</p>
            ) : existingShowtimes.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No showtimes scheduled yet.</p>
            ) : (
              <div style={{
                backgroundColor: '#f5f5f5',
                padding: '1rem',
                borderRadius: '5px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {existingShowtimes.map((showtime, index) => (
                  <div key={showtime._id || index} style={{
                    padding: '0.5rem',
                    borderBottom: index < existingShowtimes.length - 1 ? '1px solid #ddd' : 'none',
                    fontSize: '14px',
                    color: '#333'
                  }}>
                    <strong style={{ color: '#333' }}>{formatShowtime(showtime)}</strong> - <span style={{ color: '#333' }}>{showtime.showroom || 'N/A'}</span>
                    {showtime.capacity && (
                      <span style={{ color: '#666', marginLeft: '0.5rem' }}>
                        ({showtime.bookedSeats || 0}/{showtime.capacity} seats)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={saving} className={styles.submitBtn}>
          {saving ? 'Saving...' : 'Create Showtime'}
        </button>

        {message.text && (
          <div className={message.type === 'error' ? styles.errorMsg : styles.successMsg}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}

export default AddShowtime;

