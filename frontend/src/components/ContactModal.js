import React, { useState } from 'react';
import './ContactModal.css';

function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    type: 'feedback'
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      setError('Please fill in all fields');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Server returned an invalid response');
      }

      if (!response.ok) {
        const errorMsg = data?.error || data?.message || `Server error: ${response.status}`;
        throw new Error(errorMsg);
      }

      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
        setFormData({ name: '', email: '', message: '', type: 'feedback' });
      }, 2000);
    } catch (err) {
      console.error('Error sending message:', err);
      console.error('Error type:', typeof err);
      console.error('Error details:', { message: err?.message, error: err?.error, full: err });

      // Extract error message properly
      let errorMessage = 'Failed to send message. Please try again.';

      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error) {
        errorMessage = err.error;
      }

      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Get in Touch</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {sent ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <p>Thank you! Your message has been sent.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label>What's this about? *</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="type"
                    value="bug"
                    checked={formData.type === 'bug'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <span>🐛 Bug Report</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="type"
                    value="feedback"
                    checked={formData.type === 'feedback'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <span>💡 Feedback</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="type"
                    value="hello"
                    checked={formData.type === 'hello'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <span>👋 Just Say Hi</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Message *</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Your message..."
                rows="5"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={sending}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
              <button type="button" onClick={onClose} className="cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ContactModal;
