import React, { useState } from 'react';
import styles from '../styles/AdminHome.module.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function AddMovie() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [movieForm, setMovieForm] = useState({
    title: '',
    genre: '',
    rating: '',
    description: '',
    posterUrl: '',
    trailerUrl: '',
    status: 'Coming Soon',
    cast: [''],
    director: '',
    releaseDate: '',
    runtime: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMovieForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArrayChange = (field, index, value) => {
    setMovieForm(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field) => {
    setMovieForm(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setMovieForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const movieData = {
        ...movieForm,
        cast: movieForm.cast.filter(c => c.trim() !== '')
      };

      const res = await fetch(`${API_BASE}/api/movies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movieData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create movie');
      }

      setMessage({ type: 'success', text: 'Movie created successfully!' });
      setMovieForm({
        title: '',
        genre: '',
        rating: '',
        description: '',
        posterUrl: '',
        trailerUrl: '',
        status: 'Coming Soon',
        cast: [''],
        director: '',
        releaseDate: '',
        runtime: ''
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Add New Movie</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          Title *
          <input
            type="text"
            name="title"
            value={movieForm.title}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </label>

        <label className={styles.label}>
          Genre *
          <input
            type="text"
            name="genre"
            value={movieForm.genre}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </label>

        <label className={styles.label}>
          Rating *
          <input
            type="text"
            name="rating"
            value={movieForm.rating}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="PG-13"
            required
          />
        </label>

        <label className={styles.label}>
          Description *
          <textarea
            name="description"
            value={movieForm.description}
            onChange={handleInputChange}
            className={styles.textarea}
            rows="4"
            required
          />
        </label>

        <label className={styles.label}>
          Poster URL *
          <input
            type="url"
            name="posterUrl"
            value={movieForm.posterUrl}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </label>

        <label className={styles.label}>
          Trailer URL *
          <input
            type="url"
            name="trailerUrl"
            value={movieForm.trailerUrl}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </label>

        <label className={styles.label}>
          Status *
          <select
            name="status"
            value={movieForm.status}
            onChange={handleInputChange}
            className={styles.input}
            required
          >
            <option value="Coming Soon">Coming Soon</option>
            <option value="Currently Running">Currently Running</option>
          </select>
        </label>

        <label className={styles.label}>
          Director *
          <input
            type="text"
            name="director"
            value={movieForm.director}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </label>

        <label className={styles.label}>
          Release Date *
          <input
            type="text"
            name="releaseDate"
            value={movieForm.releaseDate}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="October 26, 2014"
            required
          />
        </label>

        <label className={styles.label}>
          Runtime *
          <input
            type="text"
            name="runtime"
            value={movieForm.runtime}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="2h 49m"
            required
          />
        </label>

        <div className={styles.arraySection}>
          <label className={styles.label}>
            Cast
            {movieForm.cast.map((actor, index) => (
              <div key={index} className={styles.arrayItem}>
                <input
                  type="text"
                  value={actor}
                  onChange={(e) => handleArrayChange('cast', index, e.target.value)}
                  className={styles.input}
                  placeholder="Actor name"
                />
                {movieForm.cast.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('cast', index)}
                    className={styles.removeBtn}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('cast')}
              className={styles.addBtn}
            >
              + Add Cast Member
            </button>
          </label>
        </div>

        <button type="submit" disabled={saving} className={styles.submitBtn}>
          {saving ? 'Saving...' : 'Create Movie'}
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

export default AddMovie;

