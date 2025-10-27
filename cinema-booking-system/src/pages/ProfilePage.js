import React, { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:5001";

function maskLast4(last4) {
  if (!last4) return "";
  return "•••• •••• •••• " + last4;
}

export default function ProfilePage() {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [err, setErr] = useState(null);

  const [cards, setCards] = useState([]);
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [cardMsg, setCardMsg] = useState(null);

  const token = useMemo(() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  }, []);

  async function loadMe() {
    setLoadingMe(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed (${res.status})`);
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
    } catch {}
  }

  useEffect(() => {
    if (token) {
      loadMe();
      loadCards();
    }
  }, [token]);

  function validateCardInput() {
    const n = cardNumber.replace(/\s|-/g, "");
    if (!/^\d{12,19}$/.test(n)) return "Enter a valid card number (12–19 digits for demo).";
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
          cardHolderName: `${me?.firstName ?? ""} ${me?.lastName ?? ""}`.trim() || "Cardholder",
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

  if (!token) {
    return (
      <div style={wrap}>
        <h2>Profile</h2>
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <h2>Profile</h2>

      {loadingMe ? (
        <p>Loading...</p>
      ) : err ? (
        <p style={errorStyle}>{err}</p>
      ) : me ? (
        <>
          <section style={card}>
            <h3>Account</h3>
            <div style={row}>
              <strong>Name:</strong>{" "}
              <span>
                {me.firstName || "(no first name)"} {me.lastName || ""}
              </span>
            </div>
            <div style={row}>
              <strong>Email:</strong> <span>{me.email}</span>
            </div>
            <div style={row}>
              <strong>Status:</strong> <span>{me.status}</span>
            </div>
          </section>

          <section style={card}>
            <h3>Payment Method</h3>

            {cards.length > 0 ? (
              <div style={{ marginBottom: 12 }}>
                {cards.map((c) => (
                  <div key={c.id} style={row}>
                    <strong>Saved card:</strong>{" "}
                    <span>
                      {maskLast4(c.last4)} • {String(c.expiryMonth).padStart(2, "0")}/{c.expiryYear}
                      {c.cardHolderName ? ` • ${c.cardHolderName}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ marginBottom: 12 }}>No card on file.</p>
            )}

            <form onSubmit={handleSaveCard} style={{ display: "grid", gap: 8, maxWidth: 380 }}>
              <label style={label}>
                Card number
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  style={input}
                  required
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={label}>
                  Exp. month
                  <input
                    type="number"
                    min="1"
                    max="12"
                    placeholder="MM"
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value)}
                    style={input}
                    required
                  />
                </label>

                <label style={label}>
                  Exp. year
                  <input
                    type="number"
                    min={new Date().getFullYear()}
                    max={new Date().getFullYear() + 15}
                    placeholder="YYYY"
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value)}
                    style={input}
                    required
                  />
                </label>
              </div>

              <button type="submit" disabled={savingCard} style={button}>
                {savingCard ? "Saving..." : "Save Card"}
              </button>

              {cardMsg && (
                <div style={cardMsg.type === "error" ? errorStyle : successStyle}>{cardMsg.text}</div>
              )}
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}

/* ——— Styles ——— */
const wrap = { maxWidth: 900, margin: "24px auto", padding: "0 16px", color: "#eee" };
const card = { background: "#1a1a1a", padding: 16, borderRadius: 12, marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,.3)" };
const row = { margin: "6px 0" };
const label = { display: "grid", gap: 6, fontSize: 14 };
const input = { padding: 10, borderRadius: 8, border: "1px solid #333", background: "#111", color: "#eee" };
const button = { marginTop: 6, padding: "10px 14px", borderRadius: 8, border: "none", background: "#b3170f", color: "white", cursor: "pointer" };
const errorStyle = { color: "#ff6b6b" };
const successStyle = { color: "#34d399" };
