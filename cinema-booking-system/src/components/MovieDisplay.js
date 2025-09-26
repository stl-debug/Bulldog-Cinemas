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

           
            {movie.status === 'Currently Running' && (
    <div className={styles.showtimes}>
        {(movie.showtimes && movie.showtimes.length ? movie.showtimes : ['2:00 PM', '5:00 PM', '8:00 PM']).map((show, i) => (
            <span key={i} className={styles.showtimeText}>
                {show.time || show}
            </span>
        ))}
    </div>
)}
        </div>
    );
}

export default MovieDisplay;
