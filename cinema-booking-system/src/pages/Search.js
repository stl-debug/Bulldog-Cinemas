import React, { useState, useEffect } from 'react';
import GenreFilter from '../components/GenreFilter';
import MovieDisplay from '../components/MovieDisplay';
import styles from '../styles/Search.module.css';
import homeStyles from '../styles/HomePage.module.css';

function SearchPage() {
    const [query, setQuery] = useState('');
    const [genre, setGenre] = useState('');
    const [results, setResults] = useState([]);
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);

    
    useEffect(() => {
        fetch("/api/movies")
            .then(res => res.json())
            .then(data => {
                setMovies(data);
                const allGenres = Array.from(new Set(data.map(movie => movie.genre)));
                setGenres(allGenres);
            })
            .catch(err => console.error("Error loading movies/genres", err));
    }, []);

    
    useEffect(() => {
        const filtered = movies.filter(movie =>
            movie.title.toLowerCase().includes(query.toLowerCase()) &&
            (genre === '' || movie.genre === genre)
        );
        setResults(filtered);
    }, [query, genre, movies]);

    return (
        <div>
            <div className={styles.searchContainer}>
                <div className={styles.controls}>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by title"
                    />
                    <GenreFilter
                        genres={genres}
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                    />
                </div>

                {results.length > 0 ? (
                    <div className={homeStyles.grid}>
                        {results.map(movie => (
                            <MovieDisplay key={movie._id} movie={movie} />
                        ))}
                    </div>
                ) : (
                    <p className={styles.noResults}>No movies found.</p>
                )}
            </div>
        </div>
    );
}

export default SearchPage;
