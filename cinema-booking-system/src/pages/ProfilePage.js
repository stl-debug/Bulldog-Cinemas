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

  // card form
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [cardMsg, setCardMsg] = useState(null);

  // address form
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA'
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState(null);

  // profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    promotions: false
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // password change
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

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
       if (!token) {
         throw new Error('No authentication token found');
       }
       const res = await fetch(`${API_BASE}/api/auth/profile`, {
         headers: { Authorization: `Bearer ${token}` },
       });
       if (!res.ok) {
         const d = await res.json().catch(() => ({}));
         throw new Error(d.error || `Failed to load profile (${res.status})`);
       }
      const data = await res.json();
      setMe(data);
      // Initialize profile form
      setProfileForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        promotions: data.promotions || false
      });
      // Initialize address form if address exists
      if (data.addresses && data.addresses.length > 0) {
        setAddressForm(data.addresses[0]);
      }
     } catch (e) {
       setErr(e.message);
     } finally {
       setLoadingMe(false);
     }
   }

   async function loadCards() {
     if (!token) {
       setCards([]);
       return;
     }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    
    // Check if user already has 4 cards
    if (cards.length >= 4) {
      return setCardMsg({ type: "error", text: "Maximum of 4 credit cards allowed. Please delete one before adding another." });
    }
    
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

  async function handleSaveAddress(e) {
    e.preventDefault();
    setAddressMsg(null);
    
    if (!me?.id) {
      setAddressMsg({ type: "error", text: "User ID not found" });
      return;
    }

    setSavingAddress(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: addressForm
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to save address");
      }

      setAddressMsg({ type: "success", text: "Address saved successfully" });
      setEditingAddress(false);
      await loadMe();
    } catch (e) {
      setAddressMsg({ type: "error", text: e.message });
    } finally {
      setSavingAddress(false);
    }
  }

  function handleAddressChange(e) {
    const { name, value } = e.target;
    setAddressForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileMsg(null);
    
    if (!me?.id) {
      setProfileMsg({ type: "error", text: "User ID not found" });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          promotions: profileForm.promotions
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      setProfileMsg({ type: "success", text: "Profile updated successfully" });
      setEditingProfile(false);
      await loadMe();
    } catch (e) {
      setProfileMsg({ type: "error", text: e.message });
    } finally {
      setSavingProfile(false);
    }
  }

  function handleProfileChange(e) {
    const { name, value, type, checked } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function validatePassword() {
    if (!passwordForm.oldPassword) return "Current password is required";
    if (passwordForm.newPassword.length < 8) return "New password must be at least 8 characters";
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return "Passwords do not match";
    return null;
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMsg(null);
    
    const validation = validatePassword();
    if (validation) {
      setPasswordMsg({ type: "error", text: validation });
      return;
    }

    if (!me?.id) {
      setPasswordMsg({ type: "error", text: "User ID not found" });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: passwordForm.newPassword,
          oldPassword: passwordForm.oldPassword
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setPasswordMsg({ type: "success", text: "Password changed successfully" });
      setChangingPassword(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      setPasswordMsg({ type: "error", text: e.message });
    } finally {
      setSavingPassword(false);
    }
  }

  function handlePasswordChange(e) {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  /* ------------------------- render ------------------------- */
  if (!token) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Profile</h2>
        <p className={styles.msgError}>Please log in to view your profile.</p>
        <a href="/login" className={styles.button} style={{ display: 'inline-block', textDecoration: 'none', marginTop: '12px' }}>
          Go to Login
        </a>
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
            {!editingProfile ? (
              <>
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
                <div className={styles.row}>
                  <strong>Promotions:</strong> <span>{me.promotions ? 'Yes' : 'No'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className={styles.button}
                  style={{ marginTop: '12px' }}
                >
                  Edit Profile
                </button>
                {profileMsg && (
                  <div className={profileMsg.type === "error" ? styles.msgError : styles.msgSuccess}>
                    {profileMsg.text}
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleSaveProfile} className={styles.form}>
                <label className={styles.label}>
                  First Name
                  <input
                    type="text"
                    name="firstName"
                    value={profileForm.firstName}
                    onChange={handleProfileChange}
                    className={styles.input}
                    placeholder="First name"
                  />
                </label>

                <label className={styles.label}>
                  Last Name
                  <input
                    type="text"
                    name="lastName"
                    value={profileForm.lastName}
                    onChange={handleProfileChange}
                    className={styles.input}
                    placeholder="Last name"
                  />
                </label>

                <label className={styles.label}>
                  Email (read-only)
                  <input
                    type="email"
                    value={me.email}
                    disabled
                    className={styles.input}
                    style={{ backgroundColor: '#f5f5f5' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                  <input
                    type="checkbox"
                    name="promotions"
                    checked={profileForm.promotions}
                    onChange={handleProfileChange}
                  />
                  <span>Receive promotional emails</span>
                </label>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className={styles.button}
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(false);
                    setProfileMsg(null);
                    // Reset form to original data
                    setProfileForm({
                      firstName: me.firstName || '',
                      lastName: me.lastName || '',
                      promotions: me.promotions || false
                    });
                  }}
                  className={styles.button}
                  style={{ backgroundColor: 'gray', marginLeft: '8px' }}
                >
                  Cancel
                </button>

                {profileMsg && (
                  <div className={profileMsg.type === "error" ? styles.msgError : styles.msgSuccess}>
                    {profileMsg.text}
                  </div>
                )}
              </form>
            )}
          </section>

          {/* Password Change */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Change Password</h3>
            {!changingPassword ? (
              <>
                <p className={styles.subtle}>Update your account password</p>
                <button
                  type="button"
                  onClick={() => setChangingPassword(true)}
                  className={styles.button}
                  style={{ marginTop: '12px' }}
                >
                  Change Password
                </button>
                {passwordMsg && (
                  <div className={passwordMsg.type === "error" ? styles.msgError : styles.msgSuccess}>
                    {passwordMsg.text}
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleChangePassword} className={styles.form}>
                <label className={styles.label}>
                  Current Password
                  <input
                    type="password"
                    name="oldPassword"
                    value={passwordForm.oldPassword}
                    onChange={handlePasswordChange}
                    className={styles.input}
                    placeholder="Enter current password"
                    required
                  />
                </label>

                <label className={styles.label}>
                  New Password
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className={styles.input}
                    placeholder="Enter new password (min 8 characters)"
                    minLength={8}
                    required
                  />
                </label>

                <label className={styles.label}>
                  Confirm New Password
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className={styles.input}
                    placeholder="Confirm new password"
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className={styles.button}
                >
                  {savingPassword ? "Changing..." : "Change Password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(false);
                    setPasswordMsg(null);
                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className={styles.button}
                  style={{ backgroundColor: 'gray', marginLeft: '8px' }}
                >
                  Cancel
                </button>

                {passwordMsg && (
                  <div className={passwordMsg.type === "error" ? styles.msgError : styles.msgSuccess}>
                    {passwordMsg.text}
                  </div>
                )}
              </form>
            )}
          </section>

          {/* Address */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Address</h3>
            {!editingAddress ? (
              <>
                {me.addresses && me.addresses.length > 0 ? (
                  <div style={{ marginBottom: '12px' }}>
                    {me.addresses[0].line1 && <div className={styles.row}>{me.addresses[0].line1}</div>}
                    {me.addresses[0].line2 && <div className={styles.row}>{me.addresses[0].line2}</div>}
                    {(me.addresses[0].city || me.addresses[0].state || me.addresses[0].zip) && (
                      <div className={styles.row}>
                        {me.addresses[0].city}{me.addresses[0].city && me.addresses[0].state ? ', ' : ''}{me.addresses[0].state} {me.addresses[0].zip}
                      </div>
                    )}
                    {me.addresses[0].country && <div className={styles.row}>{me.addresses[0].country}</div>}
                  </div>
                ) : (
                  <p className={styles.subtle}>No address on file.</p>
                )}
                <button
                  type="button"
                  onClick={() => setEditingAddress(true)}
                  className={styles.button}
                  style={{ marginTop: '12px' }}
                >
                  {me.addresses && me.addresses.length > 0 ? "Edit Address" : "Add Address"}
                </button>
              </>
            ) : (
              <form onSubmit={handleSaveAddress} className={styles.form}>
                <label className={styles.label}>
                  Address Line 1
                  <input
                    type="text"
                    name="line1"
                    value={addressForm.line1}
                    onChange={handleAddressChange}
                    className={styles.input}
                    placeholder="123 Main St"
                  />
                </label>

                <label className={styles.label}>
                  Address Line 2
                  <input
                    type="text"
                    name="line2"
                    value={addressForm.line2}
                    onChange={handleAddressChange}
                    className={styles.input}
                    placeholder="Apt 4B"
                  />
                </label>

                <div className={styles.grid2}>
                  <label className={styles.label}>
                    City
                    <input
                      type="text"
                      name="city"
                      value={addressForm.city}
                      onChange={handleAddressChange}
                      className={styles.input}
                      placeholder="City"
                    />
                  </label>

                  <label className={styles.label}>
                    State
                    <input
                      type="text"
                      name="state"
                      value={addressForm.state}
                      onChange={handleAddressChange}
                      className={styles.input}
                      placeholder="State"
                    />
                  </label>
                </div>

                <div className={styles.grid2}>
                  <label className={styles.label}>
                    ZIP Code
                    <input
                      type="text"
                      name="zip"
                      value={addressForm.zip}
                      onChange={handleAddressChange}
                      className={styles.input}
                      placeholder="12345"
                    />
                  </label>

                  <label className={styles.label}>
                    Country
                    <input
                      type="text"
                      name="country"
                      value={addressForm.country}
                      onChange={handleAddressChange}
                      className={styles.input}
                      placeholder="USA"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={savingAddress}
                  className={styles.button}
                >
                  {savingAddress ? "Saving..." : "Save Address"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingAddress(false);
                    setAddressMsg(null);
                    // Reset form to original data
                    if (me.addresses && me.addresses.length > 0) {
                      setAddressForm(me.addresses[0]);
                    } else {
                      setAddressForm({
                        line1: '', line2: '', city: '', state: '', zip: '', country: 'USA'
                      });
                    }
                  }}
                  className={styles.button}
                  style={{ backgroundColor: 'gray', marginLeft: '8px' }}
                >
                  Cancel
                </button>

                {addressMsg && (
                  <div className={addressMsg.type === "error" ? styles.msgError : styles.msgSuccess}>
                    {addressMsg.text}
                  </div>
                )}
              </form>
            )}
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

              <button type="submit" disabled={savingCard || cards.length >= 4} className={styles.button}>
                {cards.length >= 4 ? "Maximum 4 cards reached" : savingCard ? "Saving..." : "Save Card"}
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
