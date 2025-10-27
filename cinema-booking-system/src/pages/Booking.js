import React, { useState, useEffect, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styles from '../styles/Booking.module.css';
import { UserContext } from '../context/UserContext';

function BookingPage() {
    const { user } = useContext(UserContext);
    const { movieId, time } = useParams();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const date = searchParams.get("date");
    const navigate = useNavigate();

    const [movieTitle, setMovieTitle] = useState('');
    const rows = ["A", "B", "C", "D"];
    const seatsPerRow = 8;
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [ticketTypes, setTicketTypes] = useState({}); 
    const [error, setError] = useState('');


    useEffect(() => {
        fetch(`http://localhost:5001/api/movies/${movieId}`)
            .then(res => res.json())
            .then(data => setMovieTitle(data.title))
            .catch(err => console.error(err));
    }, [movieId]);

    // Redirect to login if not logged in
    useEffect(() => {
        if (!user) {
            navigate(`/login?redirect=/booking/${movieId}/${time}?date=${date}`);
        }
    }, [user, navigate, movieId, time, date]);

    const handleSeatClick = (seatId) => {
        if (selectedSeats.includes(seatId)) {
            setSelectedSeats(selectedSeats.filter(seat => seat !== seatId));
            const newTicketTypes = { ...ticketTypes };
            delete newTicketTypes[seatId];
            setTicketTypes(newTicketTypes);
        } else {
            setSelectedSeats([...selectedSeats, seatId]);
        }
    };

    const handleTicketTypeChange = (seatId, type) => {
        setTicketTypes({ ...ticketTypes, [seatId]: type });
    };

    const formattedDate = date
        ? new Date(date + 'T00:00').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : '';

    const handleContinueBooking = () => {
        if (selectedSeats.length === 0) {
            setError('Please select at least one seat.');
            return;
        }
        if (!selectedSeats.every(seat => ticketTypes[seat])) {
            setError('Please select a ticket type for all selected seats.');
            return;
        }
        
        setError('');
        navigate('/review-booking', { state: { movieTitle, date: formattedDate, time, selectedSeats, ticketTypes } });
    };

    return (
        <div className={styles.bookingContainer}>
            <h1>Booking</h1>
            <h3>Movie: {movieTitle}</h3>
            <h3>Date: {formattedDate}</h3>
            <h3>Time: {time}</h3>

            <div style={{ marginTop: "30px" }}>
                <h2 className={styles.sectionTitle}>Select Your Seats *</h2>
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

                {selectedSeats.length > 0 && (
                    <>
                        <h2 className={styles.sectionTitle}>Select Ticket Type for Each Seat *</h2>
                        {selectedSeats.map(seat => (
                            <div key={seat} className={styles.ticketRow}>
                                <span>{seat}</span>
                                <select className={styles.ticketDropdown}
                                    value={ticketTypes[seat] || ''}
                                    onChange={(e) => handleTicketTypeChange(seat, e.target.value)}
                                >
                                    <option value="">--Choose ticket type--</option>
                                    <option value="child">Child ($8.00)</option>
                                    <option value="adult">Adult ($15.00)</option>
                                    <option value="senior">Senior ($10.00)</option>
                                </select>
                            </div>
                        ))}
                    </> 
                )}

                <button
                    className={styles.proceedButton}
                    onClick={handleContinueBooking}
                >
                    Continue Booking
                </button>
                {error && <p className={styles.error}>{error}</p>}
            </div>
        </div>
    );
}

export default BookingPage;
