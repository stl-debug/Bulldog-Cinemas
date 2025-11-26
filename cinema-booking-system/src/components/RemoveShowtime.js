import React, { useState, useEffect } from 'react';
import styles from '../styles/AdminHome.module.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function RemoveShowtime() {
  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState('');
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadMovies();
  }, []);

  useEffect(() => {
    if (selectedMovie) {
      loadShowtimes(selectedMovie);
    } else {
      setShowtimes([]);
    }
  }, [selectedMovie]);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/movies`);
      if (res.ok) {
        const data = await res.json();
        setMovies(data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load movies' });
    } finally {
      setLoading(false);
    }
  };

  const loadShowtimes = async (movieId) => {
    try {
      setLoadingShowtimes(true);
      const res = await fetch(`${API_BASE}/api/showtimes/${movieId}`);
      if (res.ok) {
        const data = await res.json();
        setShowtimes(data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load showtimes' });
      setShowtimes([]);
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

  const handleDelete = async (showtimeId) => {
    if (!window.confirm('Are you sure you want to delete this showtime?')) {
      return;
    }

    setDeleting(true);
    setMessage({ type: '', text: '' });

    try {
      console.log('Deleting showtime:', showtimeId);
      const res = await fetch(`${API_BASE}/api/showtimes/${showtimeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', res.status, res.statusText);
      const contentType = res.headers.get('content-type');
      console.log('Content-Type:', contentType);

      if (!res.ok) {
        // Try to parse error as JSON, but handle HTML responses
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.error || `Failed to delete showtime: ${res.status}`);
        } else {
          const text = await res.text();
          console.error('Non-JSON response:', text.substring(0, 200));
          throw new Error(`Failed to delete showtime: ${res.status} ${res.statusText}`);
        }
      }

      const data = await res.json();
      setMessage({ type: 'success', text: data.message || 'Showtime deleted successfully!' });
      if (selectedMovie) {
        loadShowtimes(selectedMovie); // Reload the list
      }
    } catch (err) {
      console.error('Delete error:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Remove Showtime</h2>
      {loading ? (
        <p>Loading movies...</p>
      ) : (
        <div className={styles.form}>
          <label className={styles.label}>
            Select Movie
            <select
              value={selectedMovie}
              onChange={(e) => setSelectedMovie(e.target.value)}
              className={styles.input}
            >
              <option value="">Select a movie</option>
              {movies.map((movie) => (
                <option key={movie._id} value={movie._id}>
                  {movie.title}
                </option>
              ))}
            </select>
          </label>

          {selectedMovie && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '16px', fontWeight: 'bold' }}>
                Showtimes for this Movie:
              </h3>
              {loadingShowtimes ? (
                <p>Loading showtimes...</p>
              ) : showtimes.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic' }}>No showtimes scheduled for this movie.</p>
              ) : (
                <div style={{
                  backgroundColor: '#f5f5f5',
                  padding: '1rem',
                  borderRadius: '5px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {showtimes.map((showtime) => (
                    <div key={showtime._id} style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid #ddd',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ color: '#333' }}>
                        <strong>{formatShowtime(showtime)}</strong> - {showtime.showroom || 'N/A'}
                        {showtime.capacity && (
                          <span style={{ color: '#666', marginLeft: '0.5rem' }}>
                            ({showtime.bookedSeats || 0}/{showtime.capacity} seats)
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(showtime._id)}
                        disabled={deleting}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '4px',
                          cursor: deleting ? 'not-allowed' : 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {message.text && (
            <div className={message.type === 'error' ? styles.errorMsg : styles.successMsg} style={{ marginTop: '1rem' }}>
              {message.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RemoveShowtime;

