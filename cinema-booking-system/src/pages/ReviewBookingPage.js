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

    const { showtimeId, selectedSeats, ticketTypes } = bookingData;

    // Calculate total price
    const ticketPrices = { child: 8, adult: 15, senior: 10 };
    const totalPrice = selectedSeats.reduce(
        (sum, seat) => sum + (ticketPrices[ticketTypes[seat]] || 0),
        0
    );

    const handlePurchase = async () => {
        if (!cardNumber || !expiry || !cvv) {
            setError('Please fill in all payment fields.');
            return;
        }

        try {
            const token = localStorage.getItem("token");

            const res = await fetch("http://localhost:5001/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    // Support both _id and id shapes from UserContext
                    user: (user && (user._id || user.id)) || null,
                    showtime: showtimeId || null,
                    seats: selectedSeats.map(seat => ({
                        row: seat[0],
                        number: parseInt(seat.slice(1))
                    })),
                    ticketCount: selectedSeats.length,
                    ageCategories: Object.values(ticketTypes)
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Booking failed");
                return;
            }

            setSuccess("Tickets booked successfully!");
            setTimeout(() => navigate("/order-confirmation", { state: data }), 500);
        } catch (err) {
            setError("Network error");
        }
    };


    return (
        <div className={styles.reviewContainer}>
            <div className={styles.leftColumn}>
                <h1>Review Your Booking</h1>

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

