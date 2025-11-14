import React, { useContext, useEffect, useState } from 'react';
import MovieList from '../components/MovieList';
import styles from '../styles/HomePage.module.css';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';


function HomePage() {
    const navigate = useNavigate();
    const { user } = useContext(UserContext);
    
    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/admin-home');
        }
    }, [user, navigate]);

    const [movies, setMovies] = useState([]);

    useEffect(() => {
        fetch('http://localhost:5001/api/movies')
            .then(res => res.json())
            .then(data => setMovies(data))
            .catch(err => console.error(err));
    }, []);


    const [selectedGenre] = useState("");


    return (
        <div>

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

