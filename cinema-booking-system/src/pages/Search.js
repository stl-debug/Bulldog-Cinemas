import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import GenreFilter from '../components/GenreFilter';
import styles from '../styles/Search.module.css';

function SearchPage() {
    const [query, setQuery] = useState('');
    const [genre, setGenre] = useState('');
    const [results, setResults] = useState([]);
    const [genres, setGenres] = useState([]);

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const response = await fetch('http://localhost:5001/api/genres');
                const data = await response.json();
                setGenres(data);
            } catch (error) {
                console.error("Error fetching genres:", error);
            }
        };
        fetchGenres();
    }, []);

    const handleSearch = async () => {
        try {
            const response = await fetch(`http://localhost:5001/api/movies`);
            const data = await response.json();
            
            const filtered = data.filter(movie => {
                return movie.title.toLowerCase().includes(query.toLowerCase()) &&
                       (genre ? movie.genre === genre : true);
            });
            setResults(filtered);
        } catch (error) {
            console.error("Error fetching search results:", error);
        }
    };

    return (
        <div>
            <Header />
            <div className={styles.searchContainer}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by title"
                />
                <button onClick={handleSearch}>Search</button>
               <GenreFilter genres={['', ...genres]} value={genre} onChange={(e) => setGenre(e.target.value)} />
                <ul>
                    {results.map(movie => (
                        <li key={movie._id}>{movie.title} - {movie.genre}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default SearchPage;
