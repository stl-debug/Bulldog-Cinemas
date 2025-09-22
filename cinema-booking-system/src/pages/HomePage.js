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
            },
            {
                id: 3,
                title: 'Starstruck',
                poster: '/images/starstruck.jpg',
                status: 'Running',
            },
            {
                id: 2,
                title: 'Inside Out 3',
                poster: '/images/insideout3.jpg',
                status: 'Coming Soon',
            },
        ]);
    }, []);

    return (
        <div>
            <Header />
            <div className={styles.container}>
                <MovieList movies={movies} />
            </div>
        </div>
    );
}

export default HomePage;
