import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import styles from '../styles/MovieDetails.module.css';
import { Link } from 'react-router-dom';

function MovieDetails() {
    const { id } = useParams();

    // Mock data
    const movie = {
        id,
        title: 'Lemonade Mouth',
        poster: '/images/lemonademouth.jpeg',
        rating: 'PG',
        description: 'Misfit students in detention together form a band',
        showtimes: ['2:00 PM', '5:00 PM', '8:00 PM'],
        trailer: 'https://www.youtube.com/embed/Ecn8dvDK7LQ'
    };

    return (
        <div>
            <Header />
            <div className={styles.container}>
                <img src={movie.poster} alt={movie.title} className={styles.poster} />
                <div className={styles.details}>
                    <h2>{movie.title}</h2>
                    <p><strong>Rating:</strong> {movie.rating}</p>
                    <p>{movie.description}</p>
                    <h4>Showtimes</h4>
                    <ul>
                         {movie.showtimes.map((time, i) => (
                             <li key={i}>
                                  <Link to={`/booking/${movie.id}/${encodeURIComponent(time)}`}>
                                       {time}
                                 </Link>
                              </li>
                          ))}
                    </ul>
                    <h4>Trailer</h4>
                    <iframe
                        width="560"
                        height="315"
                        src={movie.trailer}
                        title="YouTube trailer"
                        frameBorder="0"
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
        </div>
    );
}

export default MovieDetails;
