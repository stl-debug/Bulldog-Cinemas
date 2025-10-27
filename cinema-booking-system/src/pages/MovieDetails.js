import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from '../styles/MovieDetails.module.css';

function MovieDetails() {
    const { id } = useParams();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');

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

    if (loading) return <p>Loading movie details...</p>;
    if (!movie) return <p>Movie not found.</p>;

    const today = new Date();
    const nextWeek = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d.toISOString().split('T')[0];
    });

    return (
        <div>

            <div className={styles.container}>

                <div className={styles.posterContainer}>
                    <img src={movie.posterUrl} alt={movie.title} className={styles.poster} />

                    {movie.status === "Currently Running" ? (
                        <div className={styles.datePicker}>
                            <h4>Step 1: Choose a date</h4>
                            <input
                                type="date"
                                value={selectedDate}
                                min={nextWeek[0]}
                                max={nextWeek[nextWeek.length - 1]}
                                onChange={e => setSelectedDate(e.target.value)}
                            />
                        </div>
                    ) : (
                        <p style={{ marginTop: '1rem', color: '#ccc' }}>
                            This movie is coming soon! Booking is not available yet.
                        </p>
                    )}
                </div>

                <div className={styles.rightPanel}>
                    <div className={styles.details}>
                        <h2>{movie.title}</h2>
                        <p><strong>Rating:</strong> {movie.rating}</p>
                        <p>{movie.description}</p>


                        {movie.status === "Currently Running" && selectedDate && (
                            <>
                                <h4>Step 2: Choose a showtime to book</h4>
                                <div className={styles.showtimes}>
                                    {(movie.showtimes?.length
                                        ? movie.showtimes
                                        : [{ time: '2:00 PM' }, { time: '5:00 PM' }, { time: '8:00 PM' }]
                                    ).map((show, i) => (
                                        <Link
                                            key={i}
                                            to={`/booking/${movie._id}/${encodeURIComponent(show.time || show)}?date=${selectedDate}`}
                                            className={styles.showtimeButton}
                                        >
                                            {show.time || show}
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}


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


                    <div className={styles.sidebar}>
                        <h3>Movie Info</h3>
                        <p><strong>Director:</strong> {movie.director}</p>
                        <p><strong>Cast:</strong></p>
                        <ul>
                            {movie.cast?.map((actor, i) => (
                                <li key={i}>{actor}</li>
                            ))}
                        </ul>
                        <p><strong>Genre:</strong> {movie.genre}</p>
                        <p><strong>Runtime:</strong> {movie.runtime}</p>
                        <p><strong>Release Date:</strong> {movie.releaseDate}</p>
                        <p><strong>Status:</strong> {movie.status}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MovieDetails;
