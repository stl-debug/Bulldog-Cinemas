import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import styles from '../styles/Booking.module.css';

function ReviewBookingPage() {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const location = useLocation();
    const bookingData = location.state;

    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Redirect if user is not logged in
    useEffect(() => {
        if (!user) {
            navigate(`/login?redirect=/review-booking`);
        }
    }, [user, navigate]);

    if (!bookingData) {
        return <p>No booking data found. Please go back and select seats.</p>;
    }

    const { movieTitle, date, time, selectedSeats, ticketTypes } = bookingData;

    // Calculate total price
    const ticketPrices = { child: 8, adult: 15, senior: 10 };
    const totalPrice = selectedSeats.reduce(
        (sum, seat) => sum + (ticketPrices[ticketTypes[seat]] || 0),
        0
    );

    const handlePurchase = () => {
        if (!cardNumber || !expiry || !cvv) {
            setError('Please fill in all payment fields.');
            return;
        }

        console.log('Purchasing tickets:', { movieTitle, date, time, selectedSeats, ticketTypes, cardNumber, expiry, cvv });

        setSuccess('Tickets purchased successfully!');
        setError('');
        setTimeout(() => navigate('/order-confirmation'), 500);
    };

    return (
        <div className={styles.reviewContainer}>
            <div className={styles.leftColumn}>
                <h1>Review Your Booking</h1>
                <h3>Movie: {movieTitle}</h3>
                <h3>Date: {date}</h3>
                <h3>Time: {time}</h3>

                <div >
                    <h2 className={styles.sectionTitle}>Payment Information</h2>
                    {error && <p className={styles.error}>{error}</p>}
                    {success && <p className={styles.success}>{success}</p>}

                    <input 
                        type="text"
                        placeholder="Card Number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className={styles.input}
                    />
                    <input
                        type="text"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className={styles.input}
                    />
                    <input
                        type="text"
                        placeholder="CVV"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        className={styles.input}
                    />

                    <button className={styles.proceedButton} onClick={handlePurchase}>
                        Purchase Tickets
                    </button>
                </div>
            </div>

            <div className={styles.rightColumn}>
                <h2>Order Summary</h2>
                <ul>
                    {selectedSeats.map(seat => (
                        <li key={seat}>
                            {seat} - {ticketTypes[seat]} (${ticketPrices[ticketTypes[seat]]})
                        </li>
                    ))}
                </ul>
                <h3>Total: ${totalPrice}</h3>
            </div>
        </div>
    );
}

export default ReviewBookingPage;

