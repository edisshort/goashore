import React from 'react';
import '../styles/StatsPanel.css';
function StatsPanel({ stats }) {
if (!stats) {
return <div className="stats-loading">Loading statistics...</div>;
}
return (
<div className="stats-container">
<h2>📊 Goa Beach Cleanup Impact</h2>
  <div className="stats-grid">
    <div className="stat-card">
      <div className="stat-icon">🗑️</div>
      <div className="stat-info">
        <p className="stat-label">Total Trash Collected</p>
        <p className="stat-number">{stats.totalTrashCollected}</p>
        <p className="stat-unit">kg</p>
      </div>
    </div>

    <div className="stat-card">
      <div className="stat-icon">👥</div>
      <div className="stat-info">
        <p className="stat-label">Total Volunteers</p>
        <p className="stat-number">{stats.totalVolunteers}</p>
        <p className="stat-unit">people</p>
      </div>
    </div>

    <div className="stat-card">
      <div className="stat-icon">📅</div>
      <div className="stat-info">
        <p className="stat-label">Cleanup Events</p>
        <p className="stat-number">{stats.totalCleanups}</p>
        <p className="stat-unit">events</p>
      </div>
    </div>

    <div className="stat-card">
      <div className="stat-icon">🏖️</div>
      <div className="stat-info">
        <p className="stat-label">Beaches Tracked</p>
        <p className="stat-number">{stats.totalBeaches || 0}</p>
        <p className="stat-unit">beaches</p>
      </div>
    </div>
  </div>

  <div className="impact-message">
    <h3>🌊 Your Impact Matters</h3>
    <p>
      Every cleanup event contributes to preserving Goa's beautiful coastline for future generations.
    </p>
  </div>
</div>
);
}
export default StatsPanel;