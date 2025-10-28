// src/App.js
import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/Search';
import MovieDetails from './pages/MovieDetails';
import BookingPage from './pages/Booking';
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { UserProvider } from './context/UserContext';
import ReviewBookingPage from "./pages/ReviewBookingPage";
import AdminHome from './pages/AdminHome';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import RegistrationPage from './pages/RegistrationPage';
import ProfilePage from './pages/ProfilePage';



function App() {
  return (
    <UserProvider>
      <Router>
        <div className="appContainer">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/booking/:movieId/:time" element={<BookingPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/admin-home" element={<AdminHome />} />
            <Route path="/review-booking" element={<ReviewBookingPage />} />
            <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
            <Route path="/signup" element={<RegistrationPage />} />
            <Route path="/profile" element={<ProfilePage />} />


            
          </Routes>
        </div>
      </Router>
    </UserProvider>
  );
}

export default App;
