import React from 'react';

function GenreFilter({ genres, value, onChange }) {
  return (
    <select value={value} onChange={onChange}>
      <option value="">All Genres</option>
      {genres.map((genre) => (
        <option key={genre} value={genre}>{genre}</option>
      ))}
    </select>
  );
}

export default GenreFilter;
