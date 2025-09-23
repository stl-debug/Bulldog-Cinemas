import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import MovieList from '../components/MovieList';
import styles from '../styles/HomePage.module.css';

function HomePage() {
    const [movies, setMovies] = useState([]);

    useEffect(() => {
        fetch('http://localhost:5001/api/movies')
            .then(res => res.json())
            .then(data => setMovies(data))
            .catch(err => console.error(err));
    }, []);

    const [selectedGenre, setSelectedGenre] = useState("");

    return (
        <div>
            <Header />
            <div className={styles.container}>
                <MovieList movies={movies} genre={selectedGenre} />
            </div>
        </div>
    );
}

export default HomePage;
