// src/pages/ProfilePage.js
import React, { useEffect, useMemo, useState } from "react";
import styles from "../styles/ProfilePage.module.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:5001";

function maskLast4(last4) {
  if (!last4) return "";
  return "•••• •••• •••• " + last4;
}

export default function ProfilePage() {
  // profile
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [err, setErr] = useState(null);

  // cards
  const [cards, setCards] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  // form
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [cardMsg, setCardMsg] = useState(null);

  // auth token
  const token = useMemo(() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  }, []);

  /* ------------------------- data loaders ------------------------- */
  async function loadMe() {
    setLoadingMe(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Failed to load profile (${res.status})`);
      }
      setMe(await res.json());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoadingMe(false);
    }
  }

  async function loadCards() {
    try {
      const res = await fetch(`${API_BASE}/api/payment-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCards(await res.json());
      else setCards([]);
    } catch {
      setCards([]);
    }
  }

  useEffect(() => {
    if (token) {
      loadMe();
      loadCards();
    }
  }, [token]);

  /* ------------------------- validators & handlers ------------------------- */
  function validateCardInput() {
    const n = cardNumber.replace(/\s|-/g, "");
    if (!cardHolderName.trim()) return "Please enter the cardholder name.";
    if (!/^\d{12,19}$/.test(n)) return "Enter a valid card number (12–19 digits).";
    const m = Number(expMonth);
    const y = Number(expYear);
    if (!(m >= 1 && m <= 12)) return "Month must be 1–12.";
    if (!(y >= new Date().getFullYear() && y <= new Date().getFullYear() + 15))
      return `Year must be ${new Date().getFullYear()}–${new Date().getFullYear() + 15}.`;
    return null;
  }

  async function handleSaveCard(e) {
    e.preventDefault();
    setCardMsg(null);
    const v = validateCardInput();
    if (v) return setCardMsg({ type: "error", text: v });

    const n = cardNumber.replace(/\s|-/g, "");

    setSavingCard(true);
    try {
      const res = await fetch(`${API_BASE}/api/payment-cards`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cardNumber: n,
          cardHolderName: cardHolderName.trim(),
          expiryMonth: String(expMonth).padStart(2, "0"),
          expiryYear: String(expYear),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save card");

      setCardMsg({ type: "success", text: "Payment method saved." });
      setCardNumber("");
      await loadCards();
    } catch (e) {
      setCardMsg({ type: "error", text: e.message });
    } finally {
      setSavingCard(false);
    }
  }

  async function handleDeleteCard(id) {
    if (!window.confirm("Remove this card?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/payment-cards/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to remove card");
      await loadCards();
    } catch (e) {
      setCardMsg({ type: "error", text: e.message });
    } finally {
      setDeletingId(null);
    }
  }

  /* ------------------------- render ------------------------- */
  if (!token) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Profile</h2>
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Profile</h2>

      {loadingMe ? (
        <p>Loading...</p>
      ) : err ? (
        <p className={styles.msgError}>{err}</p>
      ) : me ? (
        <>
          {/* Account summary */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Account</h3>
            <div className={styles.row}>
              <strong>Name:</strong>{" "}
              <span>
                {me.firstName || "(no first name)"} {me.lastName || ""}
              </span>
            </div>
            <div className={styles.row}>
              <strong>Email:</strong> <span>{me.email}</span>
            </div>
            <div className={styles.row}>
              <strong>Status:</strong> <span>{me.status}</span>
            </div>
          </section>

          {/* Payment methods */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Payment Method</h3>

            {cards.length > 0 ? (
              <div className={styles.list}>
                {cards.map((c) => (
                  <div key={c.id} className={styles.cardRow}>
                    <div className={styles.cardRowText}>
                      <strong>Saved card:</strong>{" "}
                      <span>
                        {maskLast4(c.last4)} • {String(c.expiryMonth).padStart(2, "0")}/{c.expiryYear}
                        {c.cardHolderName ? ` • ${c.cardHolderName}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => handleDeleteCard(c.id)}
                      disabled={deletingId === c.id}
                      title="Remove card"
                    >
                      {deletingId === c.id ? "Removing..." : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.subtle}>No card on file.</p>
            )}

            <form onSubmit={handleSaveCard} className={styles.form}>
              <label className={styles.label}>
                Cardholder name
                <input
                  type="text"
                  placeholder="Name on card"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                  className={styles.input}
                  required
                />
              </label>

              <label className={styles.label}>
                Card number
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) =>
                    setCardNumber(e.target.value.replace(/[^\d\s-]/g, ""))
                  }
                  className={styles.input}
                  required
                />
              </label>

              <div className={styles.grid2}>
                <label className={styles.label}>
                  Exp. month
                  <input
                    type="number"
                    min="1"
                    max="12"
                    placeholder="MM"
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value)}
                    className={styles.input}
                    required
                  />
                </label>

                <label className={styles.label}>
                  Exp. year
                  <input
                    type="number"
                    min={new Date().getFullYear()}
                    max={new Date().getFullYear() + 15}
                    placeholder="YYYY"
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value)}
                    className={styles.input}
                    required
                  />
                </label>
              </div>

              <button type="submit" disabled={savingCard} className={styles.button}>
                {savingCard ? "Saving..." : "Save Card"}
              </button>

              {cardMsg && (
                <div className={cardMsg.type === "error" ? styles.msgError : styles.msgSuccess}>
                  {cardMsg.text}
                </div>
              )}
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}
