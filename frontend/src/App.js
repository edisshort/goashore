import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';
import CreateEventPage from './components/CreateEventPage';
import EventDetailPage from './components/EventDetailPage';
import LoginPage from './components/LoginPage';
import { ToastContainer } from './components/Toast';
import { Analytics } from '@vercel/analytics/react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [beaches, setBeaches]         = useState([]);
  const [events, setEvents]           = useState([]);
  const [stats, setStats]             = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Auth
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gs_user')); } catch { return null; }
  });

  // Set axios auth header on mount (in case user is already logged in)
  useEffect(() => {
    const token = localStorage.getItem('gs_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    const token = localStorage.getItem('gs_token');
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('gs_token');
    localStorage.removeItem('gs_user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Toast
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Data fetching
  const fetchBeaches = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/beaches`);
      setBeaches(res.data);
    } catch (err) { console.error('Error fetching beaches:', err); }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/cleanup-events`);
      const data = res.data;
      setEvents(Array.isArray(data) ? data : data.events || []);
    } catch (err) { console.error('Error fetching events:', err); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/stats`);
      setStats(res.data);
    } catch (err) { console.error('Error fetching stats:', err); }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/leaderboard`);
      setLeaderboard(res.data);
    } catch (err) { console.error('Error fetching leaderboard:', err); }
  }, []);

  useEffect(() => {
    Promise.all([fetchBeaches(), fetchEvents(), fetchStats(), fetchLeaderboard()])
      .finally(() => setInitialLoading(false));
  }, [fetchBeaches, fetchEvents, fetchStats, fetchLeaderboard]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents(); fetchStats(); fetchLeaderboard();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchEvents, fetchStats, fetchLeaderboard]);

  // Handlers
  const handleEventComplete = async (eventId, data) => {
    try {
      await axios.post(`${API_BASE}/api/cleanup-events/${eventId}/complete`, data);
      await Promise.all([fetchEvents(), fetchStats(), fetchBeaches(), fetchLeaderboard()]);
      setCurrentPage('dashboard');
      setSelectedEvent(null);
      showToast('Cleanup marked as complete! Thank you 🌊', 'success');
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      showToast('Failed to complete event: ' + msg, 'error');
      throw error;
    }
  };

  const handleEventDelete = async () => {
    await Promise.all([fetchEvents(), fetchStats(), fetchBeaches(), fetchLeaderboard()]);
    setCurrentPage('dashboard');
    setSelectedEvent(null);
  };

  // Loading screen
  if (initialLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading GoaShore...</p>
      </div>
    );
  }

  // Login gate
  if (!user) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <LoginPage apiBase={API_BASE} onLogin={handleLogin} />
      </>
    );
  }

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="app">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <header className="app-header">
        <div className="header-content">
          <h1 className="app-name">🌊 GoaShore</h1>
          <p className="app-tagline">Keep Goa's beaches clean</p>
        </div>
        <nav className="app-nav">
          <button
            className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-btn ${currentPage === 'create' ? 'active' : ''}`}
            onClick={() => setCurrentPage('create')}
          >
            + Schedule Cleanup
          </button>
          <div className="nav-user">
            <div className="nav-user-avatar">{initials}</div>
            <span>{user.name?.split(' ')[0]}</span>
          </div>
          <button className="nav-logout" onClick={handleLogout}>Sign out</button>
        </nav>
      </header>

      <main className="app-main">
        {currentPage === 'dashboard' && (
          <Dashboard
            events={events}
            beaches={beaches}
            stats={stats}
            leaderboard={leaderboard}
            onSelectEvent={(event) => {
              setSelectedEvent(event);
              setCurrentPage('detail');
            }}
          />
        )}

        {currentPage === 'create' && (
          <CreateEventPage
            beaches={beaches}
            apiBase={API_BASE}
            showToast={showToast}
            onEventCreated={() => {
              fetchEvents(); fetchStats(); fetchBeaches();
              setCurrentPage('dashboard');
            }}
            onCancel={() => setCurrentPage('dashboard')}
          />
        )}

        {currentPage === 'detail' && selectedEvent && (
          <EventDetailPage
            event={selectedEvent}
            apiBase={API_BASE}
            user={user}
            showToast={showToast}
            onEventComplete={handleEventComplete}
            onEventDelete={handleEventDelete}
            onBack={() => {
              setCurrentPage('dashboard');
              setSelectedEvent(null);
            }}
            onParticipantsChange={fetchEvents}
          />
        )}
      </main>
      <Analytics />
    </div>
  );
}

export default App;
