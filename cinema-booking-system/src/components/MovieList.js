import React, { useState } from 'react';
import MovieDisplay from './MovieDisplay';
import GenreFilter from './GenreFilter'; // <-- import your dropdown
import styles from '../styles/HomePage.module.css';
import { useNavigate } from 'react-router-dom';

function MovieList({ movies }) {
    const navigate = useNavigate();
    const [selectedGenre, setSelectedGenre] = useState(""); // <-- state for genre

    const handleMovieClick = (id) => {
        navigate(`/movie/${id}`);
    };

    // build list of unique genres for dropdown
    const genres = [...new Set(movies.map(m => m.genre))];

    const currentlyRunning = movies.filter(
        m => m.status === 'Running' && (selectedGenre ? m.genre === selectedGenre : true)
    );

    const comingSoon = movies.filter(
        m => m.status === 'Coming Soon' && (selectedGenre ? m.genre === selectedGenre : true)
    );

    return (
        <div className={styles.movieList}>
            {/* Genre dropdown */}
            <GenreFilter
                genres={genres}
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
            />

            <h2>Currently Running</h2>
            <div className={styles.grid}>
                {currentlyRunning.map(movie => (
                    <MovieDisplay 
                        key={movie._id} 
                        movie={movie} 
                        onClick={() => handleMovieClick(movie._id)} 
                    />
                ))}
            </div>

            <h2>Coming Soon</h2>
            <div className={styles.grid}>
                {comingSoon.map(movie => (
                    <MovieDisplay 
                        key={movie._id} 
                        movie={movie} 
                        onClick={() => handleMovieClick(movie._id)} 
                    />
                ))}
            </div>
        </div>
    );
}

export default MovieList;
