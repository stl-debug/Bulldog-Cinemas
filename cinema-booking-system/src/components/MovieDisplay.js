import React from 'react';
import styles from '../styles/HomePage.module.css';
import { Link } from 'react-router-dom';

function MovieDisplay({ movie }) {
    return (
        <div className={styles.movieDisplay}>
           <img src={movie.posterUrl} alt={movie.title} className={styles.poster} />


            <Link to={`/movie/${movie._id}`} className={styles.movieTitle}>
                {movie.title}
            </Link>

            {/* turn showtimes into links to booking page */}
            {movie.status === 'Currently Running' && (
    <div className={styles.showtimes}>
        {(movie.showtimes && movie.showtimes.length ? movie.showtimes : ['2:00 PM', '5:00 PM', '8:00 PM']).map((show, i) => (
            <Link
                key={i}
                to={`/booking/${movie._id}/${encodeURIComponent(show.time || show)}`}
                className={styles.showtimeLink}
            >
                {show.time || show}
            </Link>
        ))}
    </div>
)}
        </div>
    );
}

export default MovieDisplay;
