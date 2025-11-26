import React, { useState, useEffect } from 'react';
import styles from '../styles/HomePage.module.css';
import { Link } from 'react-router-dom';

function MovieDisplay({ movie }) {
    const [showtimes, setShowtimes] = useState([]);

    useEffect(() => {
        // Only fetch showtimes for currently running movies
        if (movie.status === 'Currently Running') {
            fetch(`/api/showtimes/${movie._id}`)
                .then(res => res.json())
                .then(data => {
                    // Sort by startTime first to maintain chronological order
                    const sorted = data.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
                    
                    // Get unique times in chronological order
                    const seenTimes = new Set();
                    const uniqueTimes = [];
                    
                    for (const showtime of sorted) {
                        const d = new Date(showtime.startTime);
                        const timeString = d.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });
                        
                        if (!seenTimes.has(timeString)) {
                            seenTimes.add(timeString);
                            uniqueTimes.push(timeString);
                        }
                    }
                    
                    setShowtimes(uniqueTimes);
                })
                .catch(err => console.error("Error fetching showtimes:", err));
        }
    }, [movie._id, movie.status]);

    return (
        <div className={styles.movieDisplay}>
            <Link to={`/movie/${movie._id}`} className={styles.movieLink}>
                <img 
                    src={movie.posterUrl} 
                    alt={movie.title} 
                    className={styles.poster} 
                />
                <h3 className={styles.movieTitle}>{movie.title}</h3>
            </Link>

            {movie.status === 'Currently Running' && (
                <div className={styles.showtimes}>
                    {showtimes.length > 0 ? (
                        showtimes.map((time, i) => (
                            <span key={i} className={styles.showtimeText}>
                                {time}
                            </span>
                        ))
                    ) : (
                        <span className={styles.showtimeText}>No showtimes available</span>
                    )}
                </div>
            )}
        </div>
    );
}

export default MovieDisplay;
