import React from 'react';
import MovieDisplay from './MovieDisplay';
import styles from '../styles/HomePage.module.css';
import { useNavigate } from 'react-router-dom';

function MovieList({ movies }) {
    const navigate = useNavigate();

    const handleMovieClick = (id) => {
        navigate(`/movie/${id}`);
    };

    const currentlyRunning = movies.filter(m => m.status === 'Running');
    const comingSoon = movies.filter(m => m.status === 'Coming Soon');

    return (
        <div className={styles.movieList}>
            <h2>Currently Running</h2>
            <div className={styles.grid}>
                {currentlyRunning.map(movie => (
                    <MovieDisplay key={movie.id} movie={movie} onClick={() => handleMovieClick(movie.id)} />
                ))}
            </div>

            <h2>Coming Soon</h2>
            <div className={styles.grid}>
                {comingSoon.map(movie => (
                    <MovieDisplay key={movie.id} movie={movie} onClick={() => handleMovieClick(movie.id)} />
                ))}
            </div>
        </div>
    );
}

export default MovieList;
