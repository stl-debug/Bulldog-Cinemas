import React, { useState, useEffect } from 'react';
import styles from '../styles/AdminHome.module.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function RemovePromotion() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDiscountText = (promo) => {
    return promo.discountType === 'PERCENT' 
      ? `${promo.discountValue}% OFF` 
      : `$${promo.discountValue} OFF`;
  };

  const handleDelete = async (promoId, promoCode) => {
    if (!window.confirm(`Are you sure you want to delete promotion "${promoCode}"?`)) {
      return;
    }

    setDeleting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`${API_BASE}/api/promotions/${promoId}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete promotion');
      }

      setMessage({ type: 'success', text: `Promotion "${promoCode}" deleted successfully!` });
      loadPromotions(); // Reload the list
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Remove Promotion</h2>
      {loading ? (
        <p>Loading promotions...</p>
      ) : promotions.length === 0 ? (
        <p>No promotions available.</p>
      ) : (
        <div>
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '1rem',
            borderRadius: '5px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {promotions.map((promo) => (
              <div key={promo._id} style={{
                padding: '1rem',
                borderBottom: '1px solid #ddd',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong style={{ color: '#333' }}>{promo._id}</strong> - {getDiscountText(promo)}
                  <div style={{ color: '#666', fontSize: '14px', marginTop: '0.25rem' }}>
                    {promo.description}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px', marginTop: '0.25rem' }}>
                    Valid: {formatDate(promo.validFrom)} - {formatDate(promo.validTo)}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(promo._id, promo._id)}
                  disabled={deleting}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: deleting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          {message.text && (
            <div className={message.type === 'error' ? styles.errorMsg : styles.successMsg} style={{ marginTop: '1rem' }}>
              {message.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RemovePromotion;

