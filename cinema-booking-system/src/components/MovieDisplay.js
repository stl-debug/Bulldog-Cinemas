import React from 'react';
import styles from '../styles/HomePage.module.css';
import { Link } from 'react-router-dom';

function MovieDisplay({ movie }) {
    return (
        <div className={styles.movieDisplay}>
            <img src={movie.poster} alt={movie.title} className={styles.poster} />
            <Link to={`/movie/${movie.id}`} className={styles.movieTitle}>
                {movie.title}
            </Link>

            {/* turn showtimes into links to booking page */}
            {movie.status === 'Running' && (
                <div className={styles.showtimes}>
                    {['2:00 PM', '5:00 PM', '8:00 PM'].map((time) => (
                        <Link
                            key={time}
                            to={`/booking/${movie._id}/${encodeURIComponent(time)}`}
                            className={styles.showtimeLink}
                        >
                            {time}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MovieDisplay;
