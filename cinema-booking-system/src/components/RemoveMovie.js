import React, { useState, useEffect } from 'react';
import styles from '../styles/AdminHome.module.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function RemoveMovie() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadMovies();
  }, []);

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

  const handleDelete = async (movieId, movieTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${movieTitle}"? This will also delete all associated showtimes.`)) {
      return;
    }

    setDeleting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`${API_BASE}/api/movies/${movieId}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete movie');
      }

      setMessage({ type: 'success', text: `Movie "${movieTitle}" deleted successfully!` });
      loadMovies(); // Reload the list
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Remove Movie</h2>
      {loading ? (
        <p>Loading movies...</p>
      ) : movies.length === 0 ? (
        <p>No movies available.</p>
      ) : (
        <div>
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '1rem',
            borderRadius: '5px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {movies.map((movie) => (
              <div key={movie._id} style={{
                padding: '1rem',
                borderBottom: '1px solid #ddd',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong style={{ color: '#333' }}>{movie.title}</strong>
                  <div style={{ color: '#666', fontSize: '14px', marginTop: '0.25rem' }}>
                    {movie.genre} • {movie.rating} • {movie.status}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(movie._id, movie.title)}
                  disabled={deleting}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: deleting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

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

export default RemoveMovie;

