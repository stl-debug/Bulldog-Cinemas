import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/Login';
import SearchPage from './pages/Search';
import MovieDetails from './pages/MovieDetails';
import BookingPage from './pages/Booking';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/movie/:id" element={<MovieDetails />} />
                <Route path="/booking/:movieId/:time" element={<BookingPage />} />
            </Routes>
        </Router>
    );
}

export default App;
