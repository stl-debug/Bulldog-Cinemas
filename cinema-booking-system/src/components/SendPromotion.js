import React, { useState, useEffect } from 'react';
import styles from '../styles/AdminHome.module.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function SendPromotion() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/promotions`);
      if (res.ok) {
        const data = await res.json();
        setPromotions(data);
      } else {
        setMessage({ type: 'error', text: 'Failed to load promotions' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load promotions' });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedPromo) {
      setMessage({ type: 'error', text: 'Please select a promotion to send' });
      return;
    }

    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`${API_BASE}/api/promotions/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: selectedPromo })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send promotion');
      }

      setMessage({ type: 'success', text: data.message || 'Promotion sent successfully!' });
      setSelectedPromo('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDiscountText = (promo) => {
    return promo.discountType === 'PERCENT' 
      ? `${promo.discountValue}% OFF` 
      : `$${promo.discountValue} OFF`;
  };

  return (
    <div className={styles.formContainer}>
      <h2>Send Promotion</h2>
      {loading ? (
        <p>Loading promotions...</p>
      ) : promotions.length === 0 ? (
        <p>No promotions available.</p>
      ) : (
        <form onSubmit={handleSend} className={styles.form}>
          <label className={styles.label}>
            Select Promotion *
            <select
              name="promotion"
              value={selectedPromo}
              onChange={(e) => setSelectedPromo(e.target.value)}
              className={styles.input}
              required
            >
              <option value="">Select a promotion</option>
              {promotions.map((promo) => (
                <option key={promo._id} value={promo._id}>
                  {promo._id} - {promo.description} ({getDiscountText(promo)})
                </option>
              ))}
            </select>
          </label>

          {selectedPromo && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}>
              {(() => {
                const promo = promotions.find(p => p._id === selectedPromo);
                if (!promo) return null;
                return (
                  <div>
                    <h3 style={{ marginTop: 0, color: '#333' }}>Promotion Details:</h3>
                    <p style={{ color: '#333', margin: '0.5rem 0' }}><strong>Code:</strong> {promo._id}</p>
                    <p style={{ color: '#333', margin: '0.5rem 0' }}><strong>Description:</strong> {promo.description}</p>
                    <p style={{ color: '#333', margin: '0.5rem 0' }}><strong>Discount:</strong> {getDiscountText(promo)}</p>
                    <p style={{ color: '#333', margin: '0.5rem 0' }}><strong>Valid From:</strong> {formatDate(promo.validFrom)}</p>
                    <p style={{ color: '#333', margin: '0.5rem 0' }}><strong>Valid To:</strong> {formatDate(promo.validTo)}</p>
                  </div>
                );
              })()}
            </div>
          )}

          <button type="submit" disabled={sending || !selectedPromo} className={styles.submitBtn}>
            {sending ? 'Sending...' : 'Send Promotion'}
          </button>

          {message.text && (
            <div className={message.type === 'error' ? styles.errorMsg : styles.successMsg}>
              {message.text}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default SendPromotion;

