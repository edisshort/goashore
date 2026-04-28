import React, { useState } from 'react';
import axios from 'axios';
import '../styles/LoginPage.css';

function LoginPage({ apiBase, onLogin }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = tab === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const res = await axios.post(`${apiBase}${endpoint}`, payload);
      localStorage.setItem('gs_token', res.data.token);
      localStorage.setItem('gs_user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left branding panel */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-name">🌊 GoaShore</div>
          <div className="login-brand-tagline">Protecting Goa's beaches, one cleanup at a time</div>
        </div>

        <div className="login-features">
          <div className="login-feature">
            <span className="login-feature-icon">🗺️</span>
            <div className="login-feature-text">
              <h3>Live Beach Map</h3>
              <p>Track the status of every beach in Goa in real-time.</p>
            </div>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">📅</span>
            <div className="login-feature-text">
              <h3>Schedule Cleanups</h3>
              <p>Organise cleanup drives and recruit volunteers easily.</p>
            </div>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">📊</span>
            <div className="login-feature-text">
              <h3>Track Impact</h3>
              <p>See how much trash has been collected and how many heroes helped.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-right">
        <div className="login-card">
          {/* Tabs */}
          <div className="login-tabs">
            <button
              className={`login-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setError(''); }}
            >
              Sign In
            </button>
            <button
              className={`login-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => { setTab('register'); setError(''); }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {tab === 'login' ? (
              <>
                <div className="login-form-title">Welcome back 👋</div>
                <div className="login-form-subtitle">Sign in to manage your beach cleanups.</div>
              </>
            ) : (
              <>
                <div className="login-form-title">Join GoaShore 🌊</div>
                <div className="login-form-subtitle">Create an account to start organising cleanups.</div>
              </>
            )}

            {error && <div className="login-error">⚠️ {error}</div>}

            {tab === 'register' && (
              <div className="login-field">
                <label>Full Name</label>
                <input
                  name="name"
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="login-field">
              <label>Email Address</label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label>Password</label>
              <input
                name="password"
                type="password"
                placeholder={tab === 'register' ? 'Min. 6 characters' : '••••••••'}
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading
                ? (tab === 'login' ? 'Signing in...' : 'Creating account...')
                : (tab === 'login' ? 'Sign In →' : 'Create Account →')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
