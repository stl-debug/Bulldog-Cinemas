import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import MovieList from '../components/MovieList';
import styles from '../styles/HomePage.module.css';

function HomePage() {
    const [movies, setMovies] = useState([]);

    useEffect(() => {
        // Mock movie data 
        setMovies([
            {
                id: 1,
                title: 'Lemonade Mouth',
                poster: '/images/lemonademouth.jpeg',
                status: 'Running',
                genre: 'Comedy',
            },
            {
                id: 3,
                title: 'Starstruck',
                poster: '/images/starstruck.jpg',
                status: 'Running',
                genre: 'Romance'
            },
            {
                id: 2,
                title: 'Inside Out 3',
                poster: '/images/insideout3.jpg',
                status: 'Coming Soon',
                genre: 'Family'
            },
        ]);
    }, []);

    const [selectedGenre, setSelectedGenre] = useState("");
    const genres = [...new Set(movies.map(m => m.genre))];

    return (
        <div>
            <Header />

            <section className={styles.bioSection}>
                <h2>Welcome to Bulldog Cinemas!</h2>
                <p>
                    At Bulldog Cinemas, you can experience the latest blockbusters 
                    in a comfortable, state-of-the-art theater! Grab your popcorn and enjoy a 
                    cinematic experience like no other!
                </p>
            </section>

            <div className={styles.container}>
                <MovieList movies={movies} genre={selectedGenre} />
            </div>
        </div>
    );
}

export default HomePage;

