import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../styles/CreateEventPage.css';

// Today's date in YYYY-MM-DD format for the min attribute
const today = new Date().toISOString().split('T')[0];

function CreateEventPage({ beaches, apiBase, showToast, onEventCreated, onCancel }) {
  const [formData, setFormData] = useState({
    beachId: '',
    beachName: '',
    beachLat: 0,
    beachLng: 0,
    title: '',
    description: '',
    date: '',
    time: '',
    volunteersNeeded: 5,
  });

  // Track actual File objects (for upload) and data-URL previews (for display) separately
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Photo helpers ────────────────────────────────────────────────────────

  const addFiles = (files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) {
      showToast('Only image files are accepted (jpg, png, etc.)', 'error');
      return;
    }
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
      setPhotoFiles(prev => [...prev, file]);
    });
  };

  const removePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Upload all staged files to /api/upload, return array of URL strings
  const uploadPhotos = async (files) => {
    const urls = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await axios.post(`${apiBase}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      urls.push(res.data.url);
    }
    return urls;
  };

  // ─── Drag-and-drop ────────────────────────────────────────────────────────

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // ─── Beach selection ──────────────────────────────────────────────────────

  const handleBeachSelect = (e) => {
    const beach = beaches.find(b => b._id === e.target.value);
    if (beach) {
      setFormData(prev => ({
        ...prev,
        beachId: beach._id,
        beachName: beach.name,
        beachLat: beach.latitude,
        beachLng: beach.longitude,
      }));
    } else {
      setFormData(prev => ({ ...prev, beachId: '', beachName: '', beachLat: 0, beachLng: 0 }));
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.beachId || !formData.title || !formData.date || !formData.time) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    if (formData.date < today) {
      showToast('Event date cannot be in the past', 'error');
      return;
    }

    try {
      setLoading(true);

      // 1. Upload photos and get URLs
      const beforePhotos = photoFiles.length > 0 ? await uploadPhotos(photoFiles) : [];

      // 2. Create the event with URL references (not base64)
      await axios.post(`${apiBase}/api/cleanup-events`, {
        ...formData,
        beforePhotos,
      });

      showToast('Cleanup event scheduled successfully! 🌊', 'success');
      onEventCreated();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      showToast('Error creating event: ' + msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="create-page">
      <div className="create-container">
        <div className="create-header">
          <h1>Schedule a Cleanup</h1>
          <p>Help keep Goa's beaches clean</p>
        </div>

        <form onSubmit={handleSubmit} className="create-form">

          {/* Beach */}
          <div className="form-section">
            <label htmlFor="beach" className="form-label">Which beach? *</label>
            <select
              id="beach"
              value={formData.beachId}
              onChange={handleBeachSelect}
              required
              className="form-input"
            >
              <option value="">Select a beach</option>
              {beaches.map(beach => (
                <option key={beach._id} value={beach._id}>{beach.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="form-section">
            <label htmlFor="title" className="form-label">Event name *</label>
            <input
              id="title"
              type="text"
              placeholder="e.g., Beach Cleanup Drive"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              className="form-input"
            />
          </div>

          {/* Description */}
          <div className="form-section">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              placeholder="What will this cleanup focus on?"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="form-input"
              rows="3"
            />
          </div>

          {/* Organiser name comes from your logged-in account — no need to enter it */}

          {/* Date & Time */}
          <div className="form-row">
            <div className="form-section">
              <label htmlFor="date" className="form-label">Date *</label>
              <input
                id="date"
                type="date"
                min={today}
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
                className="form-input"
              />
            </div>
            <div className="form-section">
              <label htmlFor="time" className="form-label">Time *</label>
              <input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                required
                className="form-input"
              />
            </div>
          </div>

          {/* Volunteers */}
          <div className="form-section">
            <label htmlFor="volunteers" className="form-label">Volunteers needed</label>
            <input
              id="volunteers"
              type="number"
              min="1"
              max="500"
              value={formData.volunteersNeeded}
              onChange={(e) => setFormData(prev => ({ ...prev, volunteersNeeded: parseInt(e.target.value) || 1 }))}
              className="form-input"
            />
          </div>

          {/* Before photos — real file upload with working drag-and-drop */}
          <div className="form-section">
            <label className="form-label">Photos of dirty beach (optional)</label>
            <div
              className={`photo-upload-box ${isDragging ? 'dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => addFiles(e.target.files)}
                style={{ display: 'none' }}
              />
              <div className="upload-text">
                <p className="upload-icon">📸</p>
                <p className="upload-title">{isDragging ? 'Drop photos here' : 'Click or drag & drop photos'}</p>
                <p className="upload-hint">JPG, PNG, WebP · max 10 MB each</p>
              </div>
            </div>

            {photoPreviews.length > 0 && (
              <div className="photo-previews">
                <p className="preview-title">{photoPreviews.length} photo(s) ready to upload</p>
                <div className="preview-grid">
                  {photoPreviews.map((preview, idx) => (
                    <div key={idx} className="photo-preview-item">
                      <img src={preview} alt={`Preview ${idx + 1}`} />
                      <button type="button" className="remove-photo" onClick={() => removePhoto(idx)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (photoFiles.length > 0 ? 'Uploading photos...' : 'Creating...') : 'Schedule Cleanup'}
            </button>
            <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default CreateEventPage;
