import React, { useState } from 'react';
import MapView from './MapView';
import '../styles/Dashboard.css';
import InsightCarousel from './InsightCarousel';

const AIBadge = ({ trashCollected }) => {
  const DIRTY_THRESHOLD = 15;
  const isDirty = (trashCollected || 0) >= DIRTY_THRESHOLD;
  return (
    <span className={`ai-badge ${isDirty ? 'dirty' : 'clean'}`}>
      {'\u{1F916}'} {isDirty ? 'Was Dirty' : 'Lightly Used'}
    </span>
  );
};

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

function LeaderboardPanel({ leaderboard }) {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-icon">{'\u{1F3C6}'}</p>
        <p>No completed cleanups yet. Be the first on the board!</p>
      </div>
    );
  }
  return (
    <div className="leaderboard-list">
      {leaderboard.map((entry, idx) => (
        <div key={entry.username} className={`leaderboard-row ${idx < 3 ? `rank-${idx + 1}` : ''}`}>
          <div className="lb-rank">{MEDALS[idx] || `#${idx + 1}`}</div>
          <div className="lb-info">
            <span className="lb-name">{entry.username || 'Anonymous'}</span>
            <span className="lb-sub">{entry.events} cleanup{entry.events !== 1 ? 's' : ''} participated</span>
          </div>
          <div className="lb-stats">
            <span className="lb-trash">{'\u{1F5D1}'} {entry.totalTrash} kg</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ events, beaches, stats, leaderboard, onSelectEvent }) {
  const [activeTab, setActiveTab] = useState('events');
  const [selectedBeachId, setSelectedBeachId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const beachFilteredEvents = selectedBeachId
    ? events.filter(e => e.beachId === selectedBeachId || e.beachId?._id === selectedBeachId)
    : events;

  const filteredEvents = beachFilteredEvents.filter(event => {
    if (filterStatus === 'all') return true;
    return event.status === filterStatus;
  });

  const upcomingEvents  = beachFilteredEvents.filter(e => e.status === 'scheduled');
  const completedEvents = beachFilteredEvents.filter(e => e.status === 'completed');
  const selectedBeach   = beaches.find(b => b._id === selectedBeachId);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatTime = (t) => {
    if (!t) return 'N/A';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const renderEventCard = (event) => (
    <div
      key={event._id}
      className={`event-item status-${event.status}`}
      onClick={() => onSelectEvent(event)}
    >
      <div className="event-main">
        <div className="event-header-row">
          <h3>{event.title}</h3>
          <div className="event-badges">
            <span className={`status-badge ${event.status}`}>
              {event.status === 'completed' ? '✓ Done' :
               event.status === 'cancelled' ? '✕ Cancelled' : '\u{1F4C5} Upcoming'}
            </span>
            {event.status === 'completed' && (
              <AIBadge trashCollected={event.trashCollected} />
            )}
          </div>
        </div>
        {!selectedBeachId && (
          <p className="event-beach">{'\u{1F3D6}'} {event.beachName}</p>
        )}
        {event.description && <p className="event-desc">{event.description}</p>}
      </div>
      <div className="event-footer">
        <div className="event-meta">
          <span>{'\u{1F4C5}'} {formatDate(event.date)}</span>
          <span>{'⏰'} {formatTime(event.time)}</span>
          <span>{'\u{1F465}'} {event.volunteersJoined || 0}/{event.volunteersNeeded || 0}</span>
        </div>
        {event.status === 'completed' && (
          <div className="event-results">
            <span>{'\u{1F5D1}'} {event.trashCollected || 0}kg</span>
            {event.afterPhotos?.length > 0 && (
              <span>{'\u{1F4F8}'} {event.afterPhotos.length}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderEventsContent = () => {
    if (selectedBeachId) {
      return (
        <div className="beach-history-view">
          <div className={`beach-summary-card status-bg-${selectedBeach?.status || 'clean'}`}>
            <div className="beach-summary-info">
              <h3>{'\u{1F3D6}'} {selectedBeach?.name}</h3>
              <p>{selectedBeach?.description || 'No description available.'}</p>
            </div>
            <div className={`beach-status-pill ${selectedBeach?.status || 'clean'}`}>
              {selectedBeach?.status === 'clean'       ? '✅ Clean' :
               selectedBeach?.status === 'dirty'       ? '⚠️ Dirty' : '\u{1F6A8} Help Needed'}
            </div>
          </div>

          <div className="grouped-section">
            <div className="grouped-label upcoming-label">
              {'\u{1F4C5}'} Upcoming Cleanups
              <span className="group-count">{upcomingEvents.length}</span>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="empty-state-inline">{'\u{1F30A}'} No upcoming cleanups for this beach.</div>
            ) : (
              <div className="events-list">{upcomingEvents.map(renderEventCard)}</div>
            )}
          </div>

          <div className="grouped-section">
            <div className="grouped-label completed-label">
              {'✅'} Completed Cleanups
              <span className="group-count">{completedEvents.length}</span>
            </div>
            {completedEvents.length === 0 ? (
              <div className="empty-state-inline">{'\u{1F30A}'} No cleanups done yet for this beach.</div>
            ) : (
              <div className="events-list">{completedEvents.map(renderEventCard)}</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="filter-group" style={{ marginBottom: '20px' }}>
          <button className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
          <button className={`filter-btn ${filterStatus === 'scheduled' ? 'active' : ''}`} onClick={() => setFilterStatus('scheduled')}>Upcoming</button>
          <button className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`} onClick={() => setFilterStatus('completed')}>Completed</button>
        </div>
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">{'\u{1F30A}'}</p>
            <p>No cleanups yet. Schedule one to get started!</p>
          </div>
        ) : (
          <div className="events-list">{filteredEvents.map(renderEventCard)}</div>
        )}
      </>
    );
  };

  return (
    <div className="dashboard">
      <div className="map-section">
        <MapView beaches={beaches} />
      </div>

      <InsightCarousel events={events} beaches={beaches} />

      {stats && (
        <div className="stats-section">
          <div className="stat-card">
            <span className="stat-icon">{'\u{1F9F9}'}</span>
            <div className="stat-number">{stats.totalCleanups || 0}</div>
            <div className="stat-label">Cleanups Done</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">{'\u{1F5D1}️'}</span>
            <div className="stat-number">{stats.totalTrashCollected || 0}</div>
            <div className="stat-label">kg Trash Collected</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">{'\u{1F465}'}</span>
            <div className="stat-number">{stats.totalVolunteers || 0}</div>
            <div className="stat-label">Volunteers Joined</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">{'\u{1F3D6}️'}</span>
            <div className="stat-number">{beaches.length || 0}</div>
            <div className="stat-label">Beaches Tracked</div>
          </div>
        </div>
      )}

      <div className="events-section">
        <div className="section-header">
          <div className="section-tabs">
            <button
              className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              {'\u{1F30A}'} Cleanup Events
            </button>
            <button
              className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              {'\u{1F3C6}'} Leaderboard
            </button>
          </div>

          {activeTab === 'events' && (
            <div className="beach-filter-wrap">
              <select
                className="beach-filter-select"
                value={selectedBeachId}
                onChange={e => { setSelectedBeachId(e.target.value); setFilterStatus('all'); }}
              >
                <option value="">{'\u{1F3D6}'} All Beaches</option>
                {beaches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
              {selectedBeachId && (
                <button className="clear-filter-btn" onClick={() => setSelectedBeachId('')}>
                  {'✕'} Clear
                </button>
              )}
            </div>
          )}
        </div>

        {activeTab === 'leaderboard'
          ? <LeaderboardPanel leaderboard={leaderboard} />
          : renderEventsContent()
        }
      </div>
    </div>
  );
}

export default Dashboard;
