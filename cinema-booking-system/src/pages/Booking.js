import React from 'react';
import Header from '../components/Header';
import { useParams } from "react-router-dom";

function BookingPage() {
    const {movieId, time} = useParams();
    return (
        <div>
            <Header />
            <div >
                <h2>Booking</h2>
                <h3>Movie ID: {movieId}</h3>
                <h3>Time: {time}</h3>
            </div>
        </div>
    );
}

export default BookingPage;
