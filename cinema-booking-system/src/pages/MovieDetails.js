import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import styles from '../styles/MovieDetails.module.css';
import { Link } from 'react-router-dom';

function MovieDetails() {
    const { id } = useParams();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);


useEffect(() => {
        fetch(`http://localhost:5001/api/movies/${id}`)
            .then(res => res.json())
            .then(data => {
                setMovie(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching movie details:", err);
                setLoading(false);
            });
    }, [id]);

    if (loading) {
        return <p>Loading movie details...</p>;
    }

    if (!movie) {
        return <p>Movie not found.</p>;
    }

    return (
        <div>
            <Header />
            <div className={styles.container}>
                <img src={movie.posterUrl} alt={movie.title} className={styles.poster} />
                <div className={styles.details}>
                    <h2>{movie.title}</h2>
                    <p><strong>Rating:</strong> {movie.rating}</p>
                    <p>{movie.description}</p>

                    <h4>Showtimes</h4>
                    <ul>
                        {(movie.showtimes && movie.showtimes.length
                            ? movie.showtimes
                            : [{ time: '2:00 PM' }, { time: '5:00 PM' }, { time: '8:00 PM' }]
                        ).map((show, i) => (
                            <li key={i}>
                                <Link to={`/booking/${movie._id}/${encodeURIComponent(show.time || show)}`}>
                                    {show.time || show}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {movie.trailerUrl && (
                        <>
                            <h4>Trailer</h4>
                            <iframe
                                width="560"
                                height="315"
                                src={movie.trailerUrl}
                                title="YouTube trailer"
                                frameBorder="0"
                                allowFullScreen
                            ></iframe>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MovieDetails;