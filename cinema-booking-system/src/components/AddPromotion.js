import React, { useState } from 'react';
import styles from '../styles/AdminHome.module.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function AddPromotion() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [promotionForm, setPromotionForm] = useState({
    _id: '',
    description: '',
    discountType: 'PERCENT',
    discountValue: '',
    validFrom: '',
    validTo: ''
  });

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setPromotionForm(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      if (!promotionForm._id) {
        throw new Error('Please enter a promotion code');
      }
      if (!promotionForm.description) {
        throw new Error('Please enter a description');
      }
      if (!promotionForm.discountValue || promotionForm.discountValue === '') {
        throw new Error('Please enter a discount value');
      }
      const discountValueNum = Number(promotionForm.discountValue);
      if (isNaN(discountValueNum) || discountValueNum <= 0) {
        throw new Error('Please enter a valid discount value (must be greater than 0)');
      }
      if (!promotionForm.validFrom) {
        throw new Error('Please enter a valid from date');
      }
      if (!promotionForm.validTo) {
        throw new Error('Please enter a valid to date');
      }

      const validFromDate = new Date(promotionForm.validFrom);
      const validToDate = new Date(promotionForm.validTo);

      if (isNaN(validFromDate.getTime())) {
        throw new Error('Please enter a valid "Valid From" date');
      }
      if (isNaN(validToDate.getTime())) {
        throw new Error('Please enter a valid "Valid To" date');
      }

      if (validToDate <= validFromDate) {
        throw new Error('Valid to date must be after valid from date');
      }

      const promotionData = {
        _id: promotionForm._id.trim(),
        description: promotionForm.description.trim(),
        discountType: promotionForm.discountType,
        discountValue: discountValueNum,
        validFrom: validFromDate.toISOString(),
        validTo: validToDate.toISOString()
      };

      console.log('Sending promotion data:', promotionData);

      const res = await fetch(`${API_BASE}/api/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promotionData)
      });

      const data = await res.json();
      console.log('Server response:', { status: res.status, statusText: res.statusText, data });

      if (!res.ok) {
        throw new Error(data.error || `Failed to create promotion: ${res.status} ${res.statusText}`);
      }

      setMessage({ type: 'success', text: 'Promotion created successfully!' });
      setPromotionForm({
        _id: '',
        description: '',
        discountType: 'PERCENT',
        discountValue: '',
        validFrom: '',
        validTo: ''
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Add New Promotion</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          Promotion Code *
          <input
            type="text"
            name="_id"
            value={promotionForm._id}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="FALL20"
            required
          />
        </label>

        <label className={styles.label}>
          Description *
          <input
            type="text"
            name="description"
            value={promotionForm.description}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="20% off any ticket"
            required
          />
        </label>

        <label className={styles.label}>
          Discount Type *
          <select
            name="discountType"
            value={promotionForm.discountType}
            onChange={handleInputChange}
            className={styles.input}
            required
          >
            <option value="PERCENT">Percent</option>
            <option value="FIXED">Fixed Amount</option>
          </select>
        </label>

        <label className={styles.label}>
          Discount Value *
          <input
            type="number"
            name="discountValue"
            value={promotionForm.discountValue}
            onChange={handleInputChange}
            className={styles.input}
            min="0"
            step="0.01"
            placeholder={promotionForm.discountType === 'PERCENT' ? '20' : '10.00'}
            required
          />
        </label>

        <label className={styles.label}>
          Valid From *
          <input
            type="datetime-local"
            name="validFrom"
            value={promotionForm.validFrom}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </label>

        <label className={styles.label}>
          Valid To *
          <input
            type="datetime-local"
            name="validTo"
            value={promotionForm.validTo}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </label>

        <button type="submit" disabled={saving} className={styles.submitBtn}>
          {saving ? 'Saving...' : 'Create Promotion'}
        </button>

        {message.text && (
          <div className={message.type === 'error' ? styles.errorMsg : styles.successMsg}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}

export default AddPromotion;

