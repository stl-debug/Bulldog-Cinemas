import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import styles from '../styles/Booking.module.css';

function ReviewBookingPage() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state;



  // Saved cards
  const [savedCards, setSavedCards] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("saved"); // "saved" or "new"
  const [selectedCardId, setSelectedCardId] = useState(null);

  // New card fields
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoInfo, setPromoInfo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=/review-booking`);
    }
  }, [user, navigate]);

  // Load saved cards
  useEffect(() => {
    const loadCards = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("http://localhost:5001/api/payment-cards", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.warn("Failed to load saved cards");
          return;
        }

        const cards = await res.json();
        setSavedCards(cards || []);

        if (cards && cards.length > 0) {
          setSelectedCardId(String(cards[0].id));
          setSelectedPaymentMethod("saved");
        } else {
          setSelectedPaymentMethod("new");
        }
      } catch (err) {
        console.error("Error loading saved cards:", err);
      }
    };

    if (user) {
      loadCards();
    }
  }, [user]);

  // ❗ Only now we check bookingData and possibly return
  if (!bookingData) {
    return <p>No booking data found. Please go back and select seats.</p>;
  }

  const { showtimeId, selectedSeats, ticketTypes } = bookingData;

  // Ticket prices & totals
  const ticketPrices = { child: 8, adult: 15, senior: 10 };

  const baseTotal = selectedSeats.reduce(
    (sum, seat) => sum + (ticketPrices[ticketTypes[seat]] || 0),
    0
  );

  const discountAmount = promoInfo
    ? (promoInfo.discountType === "PERCENT"
        ? Number((baseTotal * promoInfo.discountValue / 100).toFixed(2))
        : Math.min(baseTotal, Number(promoInfo.discountValue)))
    : 0;

  const finalTotal = Number(Math.max(0, baseTotal - discountAmount).toFixed(2));

  const handleApplyPromo = async () => {
    setPromoError('');
    setPromoInfo(null);

    const code = promoCode.trim();
    if (!code) {
      setPromoError("Please enter a promo code.");
      return;
    }

    try {
      setPromoApplying(true);
      const res = await fetch("http://localhost:5001/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Invalid promo code.");
      }

      setPromoInfo(data);
    } catch (err) {
      console.error("Promo apply error:", err);
      setPromoError(err.message || "Could not apply promo code.");
    } finally {
      setPromoApplying(false);
    }
  };

  const handleRemovePromo = () => {
  setPromoInfo(null);   // stop applying the discount
  setPromoCode('');     // clear the input box
  setPromoError('');    // clear any promo error message
};

  const handlePurchase = async () => {
    setError('');
    setSuccess('');

    // Decide which payment method is used
    let paymentLast4 = null;

    if (selectedPaymentMethod === "saved" && savedCards.length > 0) {
      if (!selectedCardId) {
        setError("Please select a saved card to use.");
        return;
      }

      const card = savedCards.find(c => String(c.id) === String(selectedCardId));
      if (!card) {
        setError("Selected card not found.");
        return;
      }

      paymentLast4 = card.last4;
    } else {
      // "new" card path — basic validation
      if (!cardNumber || !expiry || !cvv) {
        setError('Please fill in all payment fields.');
        return;
      }

      const digitsOnly = cardNumber.replace(/\D/g, "");
      if (digitsOnly.length < 12) {
        setError("Please enter a valid card number (at least 12 digits).");
        return;
      }

      paymentLast4 = digitsOnly.slice(-4);
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Missing auth token. Please log in again.");
        return;
      }

      const totalToCharge = finalTotal;

      const res = await fetch("http://localhost:5001/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user: (user && (user._id || user.id)) || null,
          showtime: showtimeId || null,
          seats: selectedSeats.map(seat => ({
            row: seat[0],
            number: parseInt(seat.slice(1))
          })),
          ticketCount: selectedSeats.length,
          ageCategories: Object.values(ticketTypes),
          total: totalToCharge,
          paymentLast4,
          promoCode: promoInfo?.code || null 
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Booking failed");
        return;
      }

      setSuccess(
        `Order confirmed! Charged $${totalToCharge.toFixed(
          2
        )} to card ending in ${paymentLast4}.`
      );
      setTimeout(() => navigate("/order-confirmation", { state: data }), 800);
    } catch (err) {
      console.error(err);
      setError("Network error");
    }
  };

  return (
    <div className={styles.reviewContainer}>
      <div className={styles.leftColumn}>
        <h1>Review Your Booking</h1>

        <div>
          <h2 className={styles.sectionTitle}>Payment & Confirmation</h2>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          {/* Payment method selection */}
          {savedCards.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                <input
                  type="radio"
                  value="saved"
                  checked={selectedPaymentMethod === "saved"}
                  onChange={() => setSelectedPaymentMethod("saved")}
                  style={{ marginRight: 6 }}
                />
                Use a saved card
              </label>
              <label style={{ display: "block" }}>
                <input
                  type="radio"
                  value="new"
                  checked={selectedPaymentMethod === "new"}
                  onChange={() => setSelectedPaymentMethod("new")}
                  style={{ marginRight: 6 }}
                />
                Use a new card
              </label>
            </div>
          )}

          {/* Saved cards list */}
          {selectedPaymentMethod === "saved" && savedCards.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              {savedCards.map((c) => (
                <label
                  key={c.id}
                  style={{
                    display: "block",
                    padding: "6px 8px",
                    border: "1px solid #444",
                    borderRadius: 6,
                    marginBottom: 6,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="savedCard"
                    value={c.id}
                    checked={String(selectedCardId) === String(c.id)}
                    onChange={() => setSelectedCardId(String(c.id))}
                    style={{ marginRight: 8 }}
                  />
                  **** **** **** {c.last4} — exp {String(c.expiryMonth).padStart(2, "0")}/{c.expiryYear}
                  {c.cardHolderName ? ` (${c.cardHolderName})` : ""}
                </label>
              ))}
            </div>
          )}

          {/* New card fields */}
          {(selectedPaymentMethod === "new" || savedCards.length === 0) && (
            <>
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
            </>
          )}

          {/* Promo code section */}
          <div style={{ marginTop: "1.5rem" }}>
            <h3 className={styles.sectionTitle}>Promo Code</h3>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                type="text"
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className={styles.input}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className={styles.proceedButton}
                onClick={handleApplyPromo}
                disabled={promoApplying}
              >
                {promoApplying ? "Applying..." : "Apply"}
              </button>
            </div>
            {promoError && <p className={styles.error}>{promoError}</p>}
{promoInfo && (
  <div style={{ marginTop: "0.5rem" }}>
    <p className={styles.success}>
      Applied {promoInfo.code}:{" "}
      {promoInfo.discountType === "PERCENT"
        ? `${promoInfo.discountValue}% off`
        : `$${promoInfo.discountValue} off`}
    </p>
    <button
      type="button"
      onClick={handleRemovePromo}
      className={styles.button}
      style={{ marginTop: "0.25rem", backgroundColor: "#555" }}
    >
      Remove Promo
    </button>
  </div>
)}
          </div>

          {/* Confirm order button */}
          <button
            className={styles.proceedButton}
            style={{ marginTop: "1.5rem" }}
            onClick={handlePurchase}
          >
            Confirm Order
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
        <hr />
        <p><strong>Subtotal:</strong> ${baseTotal.toFixed(2)}</p>
        {discountAmount > 0 && (
          <p>
            <strong>Discount:</strong> -${discountAmount.toFixed(2)}
          </p>
        )}
        <h3>Total: ${finalTotal.toFixed(2)}</h3>
      </div>
    </div>
  );
}

export default ReviewBookingPage;



