import React, { useState, useEffect, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styles from '../styles/Booking.module.css';
import { UserContext } from '../context/UserContext';


function BookingPage() {
  const { user } = useContext(UserContext);
  const { movieId, showtimeId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const bookingDate = searchParams.get('date'); // Extract date from query string
  const navigate = useNavigate();

  const [movieTitle, setMovieTitle] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [ticketTypes, setTicketTypes] = useState({});
  const [error, setError] = useState('');
  const [showtime, setShowtime] = useState(null);
  
  // DEBUG: Log params on mount
  console.log("=== BookingPage Loaded ===");
  console.log("movieId:", movieId);
  console.log("showtimeId:", showtimeId);
  console.log("bookingDate from query:", bookingDate);
  console.log("location.pathname:", location.pathname);
  console.log("Full URL:", window.location.href);

  const rows = ["A", "B", "C", "D"];
  const seatsPerRow = 8;

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=/booking/${movieId}/${showtimeId}`);
    }
  }, [user, navigate, movieId, showtimeId]);

  // Load movie title
  useEffect(() => {
    fetch(`/api/movies/${movieId}`)
      .then(res => res.json())
      .then(data => setMovieTitle(data.title))
      .catch(err => console.error(err));
  }, [movieId]);

  // Load showtime details
  useEffect(() => {
    console.log("BookingPage useEffect - showtimeId:", showtimeId);
    if (!showtimeId) {
      console.log("No showtimeId provided");
      return;
    }
    const url = `/api/showtime/${showtimeId}`;
    console.log("Fetching showtime from:", url);
    fetch(url)
      .then(async res => {
        console.log("Showtime fetch response status:", res.status, res.statusText);
        console.log("Response headers Content-Type:", res.headers.get('content-type'));
        const contentType = res.headers.get('content-type');
        if (!res.ok) {
          const text = await res.text();
          console.error("Error response text:", text.substring(0, 500));
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          console.error("Response is not JSON! Content-Type:", contentType, "Text:", text.substring(0, 500));
          throw new Error(`Response is not JSON. Content-Type: ${contentType}`);
        }
        const data = await res.json();
        console.log("Showtime data parsed successfully:", data);
        return data;
      })
      .then(data => {
        if (!data || !data._id) {
          setError('Showtime not found or invalid data returned.');
          setShowtime(null);
        } else {
          setShowtime(data);
          setError('');
        }
      })
      .catch(err => {
        console.error("Error loading showtime:", err);
        setError('Could not load showtime: ' + err.message);
        setShowtime(null);
      });
  }, [showtimeId]);

  const handleSeatClick = (seatId) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(seat => seat !== seatId));
      const updated = { ...ticketTypes };
      delete updated[seatId];
      setTicketTypes(updated);
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const handleTicketTypeChange = (seatId, type) => {
    setTicketTypes({ ...ticketTypes, [seatId]: type });
  };


  let formattedDate = '';
  let formattedTime = '';
  
  // Use the booking date from query string if available, otherwise use showtime startTime
  if (bookingDate) {
    // Parse the date from query string (format: YYYY-MM-DD)
    const dt = new Date(bookingDate + 'T00:00:00');
    formattedDate = dt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else if (showtime && showtime.startTime) {
    const dt = new Date(showtime.startTime);
    formattedDate = dt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  if (showtime && showtime.startTime) {
    const dt = new Date(showtime.startTime);
    formattedTime = dt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  const handleContinueBooking = () => {
    if (!showtimeId) {
      setError("Cannot book — showtime not loaded.");
      return;
    }

    if (selectedSeats.length === 0) {
      setError('Please select at least one seat.');
      return;
    }

    if (!selectedSeats.every(seat => ticketTypes[seat])) {
      setError('Please select a ticket type for all selected seats.');
      return;
    }

    const seatsForDB = selectedSeats.map(seat => ({
      row: seat[0],
      number: Number(seat.slice(1))
    }));

    const ageCategories = selectedSeats.map(seat => ticketTypes[seat]);

    // ✅ SEND TO DATABASE
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: user.id,
        showtime: showtimeId,
        seats: seatsForDB,
        movieTitle,
        ticketCount: seatsForDB.length,
        ageCategories
      })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        navigate('/order-confirmation', { state: data });
      })
      .catch(err => setError(err.message));
  };

  return (
    <div className={styles.bookingContainer}>
      <h1>Booking</h1>
      <h3>Movie: {movieTitle}</h3>
      <h3>Date: {formattedDate}</h3>
      <h3>Time: {formattedTime}</h3>

      {error && (
        <div style={{ color: 'red', marginBottom: 16 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

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
            <h2 className={styles.sectionTitle}>
              Select Ticket Type for Each Seat *
            </h2>
            {selectedSeats.map(seat => (
              <div key={seat} className={styles.ticketRow}>
                <span>{seat}</span>
                <select
                  className={styles.ticketDropdown}
                  value={ticketTypes[seat] || ''}
                  onChange={(e) =>
                    handleTicketTypeChange(seat, e.target.value)
                  }
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
      </div>
    </div>
  );
}

export default BookingPage;
