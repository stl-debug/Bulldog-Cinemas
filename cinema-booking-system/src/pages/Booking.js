import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useParams, useLocation } from 'react-router-dom';
import styles from '../styles/Booking.module.css';

function BookingPage() {
    const { movieId, time } = useParams();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const date = searchParams.get("date");

    const [movieTitle, setMovieTitle] = useState('');
    const rows = ["A", "B", "C", "D"];
    const seatsPerRow = 8;
    const [selectedSeats, setSelectedSeats] = useState([]);

    useEffect(() => {
        fetch(`http://localhost:5001/api/movies/${movieId}`)
            .then(res => res.json())
            .then(data => setMovieTitle(data.title))
            .catch(err => console.error(err));
    }, [movieId]);

    const handleSeatClick = (seatId) => {
        if (selectedSeats.includes(seatId)) {
            setSelectedSeats(selectedSeats.filter(seat => seat !== seatId));
        } else {
            setSelectedSeats([...selectedSeats, seatId]);
        }
    };

    const formattedDate = date
  ? new Date(date + 'T00:00').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  : '';

    return (
        <div>
            <Header />
            <div className={styles.bookingContainer}>
                <h1>Booking</h1>
                <h3>Movie: {movieTitle}</h3>
                <h3>Date: {formattedDate}</h3>
                <h3>Time: {time}</h3>

                <div style={{ marginTop: "30px" }}>
                    <h2 className={styles.sectionTitle}>Select Your Seats</h2>

                    <div className={styles.screen}>Movie Screen Here</div>

                    <div className={styles.seatsGrid}>
                        {rows.map(row =>
                            Array.from({ length: seatsPerRow }, (_, i) => {
                                const seatId = `${row}${i + 1}`;
                                const isSelected = selectedSeats.includes(seatId);
                                return (
                                    <button
                                        key={seatId}
                                        onClick={() => handleSeatClick(seatId)}
                                        className={`${styles.seat} ${isSelected ? styles.selected : ''}`}
                                    >
                                        {seatId}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <h2 className={styles.sectionTitle}>Select Ticket Type</h2>
                    <select className={styles.ticketDropdown}>
                        <option value="">--Choose ticket type--</option>
                        <option value="child">Child ($8.00)</option>
                        <option value="adult">Adult ($15.00)</option>
                        <option value="senior">Senior ($10.00)</option>
                    </select>

                    <button className={styles.proceedButton}>
                        Proceed to Payment {selectedSeats.length > 0 && `(Seats: ${selectedSeats.join(", ")})`}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BookingPage;
