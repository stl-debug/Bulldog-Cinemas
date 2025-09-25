import React, { useState } from 'react';
import Header from '../components/Header';
import { useParams } from "react-router-dom";

function BookingPage() {
    const {movieId, time} = useParams();
    const rows = ["A", "B", "C", "D"];
    const seatsPerRow = 8;
    const [selectedSeats, setSelectedSeats] = useState([]);

    const handleSeatClick = (seatId) => {
        if (selectedSeats.includes(seatId)) {
            setSelectedSeats(selectedSeats.filter(seat => seat !== seatId));
        } else {
            setSelectedSeats([...selectedSeats, seatId]);
        }
    };
    return (
        <div>
            <Header />
            <div >
                <h2>Booking</h2>
                <h3>Movie ID: {movieId}</h3>
                <h3>Time: {time}</h3>
                <div style={{ marginTop: "20px" }}>
                    <h3>Select Your Seats</h3>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${seatsPerRow}, auto)`, gap: "10px", marginBottom: "20px" }}>
                        {rows.map(row =>
                            Array.from({ length: seatsPerRow }, (_, i) => {
                                const seatId = `${row}${i + 1}`;
                                const isSelected = selectedSeats.includes(seatId);
                                return (
                                    <button
                                        key={seatId}
                                        onClick={() => handleSeatClick(seatId)}
                                        style={{
                                            padding: "10px",
                                            backgroundColor: isSelected ? "green" : "lightgray",
                                            border: "1px solid black",
                                            cursor: "pointer"
                                        }}
                                    >
                                        {seatId}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <h3 style={{ marginTop: "20px" }}>Select Ticket Type</h3>
                    <select>
                        <option value="">--Choose ticket type--</option>
                        <option value="child">Child</option>
                        <option value="adult">Adult</option>
                        <option value="senior">Senior</option>
                    </select>

                    <button style={{ display: "block", marginTop: "20px" }}>
                        Confirm Booking {selectedSeats.length > 0 && `(Seats: ${selectedSeats.join(", ")})`}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BookingPage;
