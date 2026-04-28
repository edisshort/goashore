import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/EventDetailPage.css';

// Build a display URL: if path starts with /uploads/... prepend API base
const photoUrl = (apiBase, path) =>
  path && path.startsWith('/') ? `${apiBase}${path}` : path;

// ── AI Cleanliness Detection (threshold-based) ───────────────────────────────
const DIRTY_THRESHOLD = 15; // kg

function AICleanlinessBadge({ trashCollected }) {
  const kg = trashCollected || 0;
  const isDirty = kg >= DIRTY_THRESHOLD;
  const confidence = isDirty
    ? Math.min(99, 70 + Math.round((kg - DIRTY_THRESHOLD) * 1.5))
    : Math.min(99, 70 + Math.round((DIRTY_THRESHOLD - kg) * 2));

  return (
    <div className={`ai-detection-badge ${isDirty ? 'was-dirty' : 'was-clean'}`}>
      <span className="ai-icon">🤖</span>
      <div className="ai-text">
        <span className="ai-label">AI Cleanliness Detection</span>
        <span className="ai-result">
          Beach was <strong>{isDirty ? 'Dirty' : 'Lightly Used'}</strong>
          <span className="ai-confidence"> ({confidence}% confidence)</span>
        </span>
      </div>
    </div>
  );
}

function EventDetailPage({ event, apiBase, user, showToast, onEventComplete, onEventDelete, onBack, onParticipantsChange }) {
  const [fullEvent, setFullEvent] = useState(event);
  const [completionData, setCompletionData] = useState({
    trashCollected: 0,
    feedback: '',
  });

  // Staged after-photos
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [imageModal, setImageModal] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef(null);

  // Derived ownership / participation
  const isOwner = user && (
    fullEvent.createdBy === user.name ||
    fullEvent.createdByUserId === user._id
  );
  const hasJoined = user && fullEvent.participants?.includes(user.name);
  const participantCount = fullEvent.participants?.length || fullEvent.volunteersJoined || 0;

  // Fetch fresh event data on mount
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await axios.get(`${apiBase}/api/cleanup-events/${event._id}`);
        setFullEvent(res.data);
      } catch (err) {
        console.error('Error fetching event:', err);
      }
    };
    fetchDetails();
  }, [event._id, apiBase]);

  // ─── Photo helpers ────────────────────────────────────────────────────────

  const addFiles = (files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) {
      showToast('Only image files are accepted', 'error');
      return;
    }
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreviews(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
      setPhotoFiles(prev => [...prev, file]);
    });
  };

  const removePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (files) => {
    const urls = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await axios.post(`${apiBase}/api/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      urls.push(res.data.url);
    }
    return urls;
  };

  // ─── Drag-and-drop ────────────────────────────────────────────────────────

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); };

  // ─── Join / Leave ─────────────────────────────────────────────────────────

  const handleJoin = async () => {
    try {
      setJoinLoading(true);
      const res = await axios.post(`${apiBase}/api/cleanup-events/${fullEvent._id}/join`);
      setFullEvent(res.data);
      if (onParticipantsChange) onParticipantsChange();
      showToast("You've joined this cleanup! 🌊", 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to join', 'error');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeave = async () => {
    try {
      setJoinLoading(true);
      const res = await axios.post(`${apiBase}/api/cleanup-events/${fullEvent._id}/leave`);
      setFullEvent(res.data);
      if (onParticipantsChange) onParticipantsChange();
      showToast('You have left this event.', 'info');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to leave', 'error');
    } finally {
      setJoinLoading(false);
    }
  };

  // ─── Completion flow ──────────────────────────────────────────────────────

  const handleCompleteClick = (e) => {
    e.preventDefault();
    if (completionData.trashCollected < 0) {
      showToast('Trash collected cannot be negative', 'error');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmedComplete = async () => {
    setShowConfirm(false);
    try {
      setLoading(true);
      const afterPhotos = photoFiles.length > 0 ? await uploadPhotos(photoFiles) : [];
      await onEventComplete(event._id, { ...completionData, afterPhotos });
    } catch {
      // onEventComplete already calls showToast for errors
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete flow ──────────────────────────────────────────────────────────

  const handleConfirmedDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      setLoading(true);
      await axios.delete(`${apiBase}/api/cleanup-events/${event._id}`);
      showToast('Event deleted successfully', 'success');
      if (onEventDelete) onEventDelete();
      else onBack();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      showToast('Error deleting event: ' + msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatTime = (t) => {
    if (!t) return 'N/A';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="detail-container">

        {/* Header */}
        <div className="detail-header">
          <div>
            <h1>{fullEvent.title}</h1>
            <p className="detail-beach">{fullEvent.beachName}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className={`detail-status ${fullEvent.status}`}>
              {fullEvent.status === 'completed' ? '✓ Completed' :
               fullEvent.status === 'cancelled' ? '✕ Cancelled' : '📅 Upcoming'}
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                style={{
                  background: '#ff4d4d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="detail-info">
          <div className="info-item">
            <span className="info-label">Date</span>
            <span className="info-value">{formatDate(fullEvent.date)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Time</span>
            <span className="info-value">{formatTime(fullEvent.time)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Organizer</span>
            <span className="info-value">{fullEvent.createdBy || 'Anonymous'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Volunteers Joined</span>
            <span className="info-value">{participantCount}/{fullEvent.volunteersNeeded}</span>
          </div>
          {fullEvent.status === 'completed' && (
            <div className="info-item">
              <span className="info-label">Trash Collected</span>
              <span className="info-value">{fullEvent.trashCollected} kg</span>
            </div>
          )}
        </div>

        {/* Participants panel */}
        <div className="participants-panel">
          <div className="participants-header">
            <span className="participants-title">
              👥 Participants
              <span className="participants-count">{participantCount}</span>
            </span>
            {/* Join / Leave button — only for non-owners on scheduled events */}
            {fullEvent.status === 'scheduled' && !isOwner && (
              hasJoined ? (
                <button
                  className="btn-leave"
                  onClick={handleLeave}
                  disabled={joinLoading}
                >
                  {joinLoading ? 'Leaving...' : '✕ Leave'}
                </button>
              ) : (
                <button
                  className="btn-join"
                  onClick={handleJoin}
                  disabled={joinLoading}
                >
                  {joinLoading ? 'Joining...' : '+ Join Cleanup'}
                </button>
              )
            )}
          </div>

          {/* Pill list of participants */}
          {fullEvent.participants?.length > 0 ? (
            <div className="participants-list">
              {fullEvent.participants.map((name, idx) => (
                <span key={idx} className={`participant-pill ${name === fullEvent.createdBy ? 'organizer' : ''}`}>
                  {name === fullEvent.createdBy ? '⭐ ' : ''}{name}
                  {name === fullEvent.createdBy && <span className="organizer-tag">Organizer</span>}
                </span>
              ))}
            </div>
          ) : (
            <p className="no-participants">No one has joined yet. Be the first!</p>
          )}
        </div>

        {/* Description */}
        {fullEvent.description && (
          <div className="detail-description">
            <h3>Description</h3>
            <p>{fullEvent.description}</p>
          </div>
        )}

        {/* AI Detection — shown on completed events */}
        {fullEvent.status === 'completed' && (
          <AICleanlinessBadge trashCollected={fullEvent.trashCollected} />
        )}

        {/* Before vs After comparison — shown when both sets of photos exist */}
        {fullEvent.status === 'completed' &&
         fullEvent.beforePhotos?.length > 0 &&
         fullEvent.afterPhotos?.length > 0 ? (
          <div className="comparison-section">
            <h3 className="comparison-title">🔄 Before vs After Comparison</h3>
            <div className="comparison-grid">
              <div className="comparison-col before-col">
                <div className="comparison-col-label before-label">📸 Before Cleanup</div>
                <div className="comparison-gallery">
                  {fullEvent.beforePhotos.map((photo, idx) => (
                    <div key={idx} className="comparison-photo" onClick={() => setImageModal(photoUrl(apiBase, photo))}>
                      <img src={photoUrl(apiBase, photo)} alt={`Before ${idx + 1}`} />
                      <div className="photo-overlay">👁️</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="comparison-divider">
                <div className="comparison-arrow">→</div>
              </div>
              <div className="comparison-col after-col">
                <div className="comparison-col-label after-label">✅ After Cleanup</div>
                <div className="comparison-gallery">
                  {fullEvent.afterPhotos.map((photo, idx) => (
                    <div key={idx} className="comparison-photo" onClick={() => setImageModal(photoUrl(apiBase, photo))}>
                      <img src={photoUrl(apiBase, photo)} alt={`After ${idx + 1}`} />
                      <div className="photo-overlay">👁️</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Fallback: show photos individually if only one side exists */
          <>
            {fullEvent.beforePhotos?.length > 0 && (
              <div className="photos-section">
                <h3>📸 Before Cleanup ({fullEvent.beforePhotos.length})</h3>
                <div className="photos-gallery">
                  {fullEvent.beforePhotos.map((photo, idx) => (
                    <div key={idx} className="photo-item" onClick={() => setImageModal(photoUrl(apiBase, photo))}>
                      <img src={photoUrl(apiBase, photo)} alt={`Before ${idx + 1}`} />
                      <div className="photo-overlay">👁️</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Completion form — only shown for scheduled events owned by current user */}
        {fullEvent.status === 'scheduled' && isOwner && (
          <form onSubmit={handleCompleteClick} className="completion-form">
            <h2>Mark Cleanup as Done</h2>

            {/* Auto volunteers info */}
            <div className="volunteers-info-box">
              <span className="volunteers-info-icon">👥</span>
              <div>
                <strong>{participantCount} volunteer{participantCount !== 1 ? 's' : ''}</strong> registered via the Join button
                <p>This will be recorded automatically.</p>
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">Trash collected (kg) *</label>
              <input
                type="number"
                min="0"
                max="5000"
                step="0.5"
                value={completionData.trashCollected}
                onChange={(e) => setCompletionData(prev => ({ ...prev, trashCollected: parseFloat(e.target.value) || 0 }))}
                className="form-input"
                required
              />
              {/* Warn if the number seems unrealistic */}
              {participantCount > 0 && completionData.trashCollected / participantCount > 100 && (
                <p className="validation-warning">
                  ⚠️ That's over 100 kg per person — double-check your number!
                </p>
              )}
              {completionData.trashCollected > 1000 && (
                <p className="validation-warning">
                  ⚠️ Over 1000 kg — are you sure? That's very high for a single beach cleanup.
                </p>
              )}
            </div>

            <div className="form-section">
              <label className="form-label">Feedback (optional)</label>
              <textarea
                placeholder="How did it go? Any challenges?"
                value={completionData.feedback}
                onChange={(e) => setCompletionData(prev => ({ ...prev, feedback: e.target.value }))}
                className="form-input"
                rows="3"
              />
            </div>

            {/* After photos with working drag-and-drop */}
            <div className="form-section">
              <label className="form-label">Photos after cleanup (optional)</label>
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
                        <img src={preview} alt={`After ${idx + 1}`} />
                        <button type="button" className="remove-photo" onClick={() => removePhoto(idx)}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (photoFiles.length > 0 ? 'Uploading photos...' : 'Saving...') : 'Complete Cleanup'}
              </button>
              <button type="button" className="btn-cancel" onClick={onBack} disabled={loading}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* After photos only — shown alone when there are no before photos */}
        {fullEvent.status === 'completed' &&
         fullEvent.afterPhotos?.length > 0 &&
         !fullEvent.beforePhotos?.length && (
          <div className="photos-section">
            <h3>📸 After Cleanup ({fullEvent.afterPhotos.length})</h3>
            <div className="photos-gallery">
              {fullEvent.afterPhotos.map((photo, idx) => (
                <div key={idx} className="photo-item" onClick={() => setImageModal(photoUrl(apiBase, photo))}>
                  <img src={photoUrl(apiBase, photo)} alt={`After ${idx + 1}`} />
                  <div className="photo-overlay">👁️</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback — only after completion */}
        {fullEvent.status === 'completed' && fullEvent.feedback && (
          <div className="feedback-section">
            <h3>💬 Feedback</h3>
            <p>{fullEvent.feedback}</p>
          </div>
        )}

        {/* Completion success banner */}
        {fullEvent.status === 'completed' && (
          <div className="completed-view">
            <div className="success-message">
              <p className="success-icon">✅</p>
              <p className="success-text">Cleanup completed successfully!</p>
              <p className="success-details">
                {formatDate(fullEvent.date)} at {formatTime(fullEvent.time)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Confirmation dialog ─────────────────────────────────────────── */}
      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <h3>Confirm Completion</h3>
            <p>
              Mark this cleanup as <strong>done</strong>? This records{' '}
              <strong>{participantCount} volunteer{participantCount !== 1 ? 's' : ''}</strong> and{' '}
              <strong>{completionData.trashCollected} kg</strong> of trash collected.
              This action cannot be undone.
            </p>
            <div className="confirm-actions">
              <button className="btn-submit" onClick={handleConfirmedComplete}>Yes, complete it</button>
              <button className="btn-cancel" onClick={() => setShowConfirm(false)}>Go back</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete confirmation dialog ──────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <h3>Delete Event</h3>
            <p>
              Are you sure you want to <strong>permanently delete</strong> "{fullEvent.title}"?
              This action cannot be undone.
            </p>
            <div className="confirm-actions">
              <button
                className="btn-submit"
                style={{ background: '#ff4d4d' }}
                onClick={handleConfirmedDelete}
              >
                Yes, delete it
              </button>
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Image lightbox ──────────────────────────────────────────────── */}
      {imageModal && (
        <div className="image-modal" onClick={() => setImageModal(null)}>
          <div className="image-modal-content" onClick={e => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setImageModal(null)}>✕</button>
            <img src={imageModal} alt="Full view" />
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDetailPage;
