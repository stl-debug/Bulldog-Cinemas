import React, { useState } from 'react';
import Header from '../components/Header';
import styles from '../styles/Search.module.css';

function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    const handleSearch = () => {
        // Mock movie data
        const movies = [
            { id: 1, title: 'Lemonade Mouth' },
            { id: 2, title: 'Inside Out 3' },
            { id: 3, title: 'Starstruck' },
        ];

        const filtered = movies.filter(m => m.title.toLowerCase().includes(query.toLowerCase()));
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
