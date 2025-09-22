import React, { useState } from 'react';
import Header from '../components/Header';
import GenreFilter from '../components/GenreFilter';
import styles from '../styles/Search.module.css';

function SearchPage() {
    const [query, setQuery] = useState('');
    const [genre, setGenre] = useState('');
    const [results, setResults] = useState([]);

    const handleSearch = () => {
        // Mock movie data
        const movies = [
            { id: 1, title: 'Lemonade Mouth', genre: 'Comedy'},
            { id: 2, title: 'Inside Out 3', genre: 'Family' },
            { id: 3, title: 'Starstruck', genre: 'Romance' },
        ];

        const genres = Array.from(new Set(movies.map(m => m.genre)));

        const filtered = movies.filter(m => m.title.toLowerCase().includes(query.toLowerCase()) && (genre === '' || m.genre === genre));
        setResults(filtered);
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
                <GenreFilter genres={['', 'Comedy', 'Family', 'Romance']} value={genre} onChange={(e) => setGenre(e.target.value)} />
                <ul>
                    {results.map(movie => (
                        <li key={movie.id}>{movie.title}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default SearchPage;
