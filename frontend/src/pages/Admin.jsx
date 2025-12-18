import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime';
import {
  getAdminRequests,
  approveRequest,
  rejectRequest,
  getViewers,
  toggleRegular,
  clearOverlay,
} from '../services/api';
import './Admin.css';

function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (!sessionStorage.getItem('adminPassword')) {
      navigate('/?admin=true');
      return;
    }
    loadData();
  }, [navigate, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'viewers') {
        const { viewers } = await getViewers();
        setViewers(viewers || []);
      } else {
        const { requests } = await getAdminRequests(activeTab === 'all' ? null : activeTab);
        setRequests(requests || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRealtimeUpdate = useCallback((payload) => {
    if (activeTab === 'viewers') return;
    
    if (payload.eventType === 'INSERT') {
      setRequests(prev => [payload.new, ...prev]);
    } else if (payload.eventType === 'UPDATE') {
      setRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
    }
  }, [activeTab]);

  useSupabaseRealtime('requests', '*', handleRealtimeUpdate);

  useSupabaseRealtime('viewers', '*', useCallback((payload) => {
    if (activeTab !== 'viewers') return;
    if (payload.eventType === 'UPDATE') {
      setViewers(prev => prev.map(v => v.id === payload.new.id ? payload.new : v));
    } else if (payload.eventType === 'INSERT') {
      setViewers(prev => [payload.new, ...prev]);
    }
  }, [activeTab]));

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await approveRequest(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await rejectRequest(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRegular = async (id) => {
    setActionLoading(id);
    try {
      const { viewer } = await toggleRegular(id);
      setViewers(prev => prev.map(v => v.id === id ? viewer : v));
    } catch (err) {
      console.error('Failed to toggle regular:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearOverlay = async () => {
    try {
      await clearOverlay();
    } catch (err) {
      console.error('Failed to clear overlay:', err);
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminPassword');
    navigate('/?admin=true');
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-title">
          <h1>Admin Dashboard</h1>
          <span className="admin-subtitle">WyldePhyre Viewer Hub</span>
        </div>
        <div className="admin-actions">
          <button className="btn btn-secondary" onClick={handleClearOverlay}>
            Clear Overlay
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        {['pending', 'approved', 'rejected', 'all', 'viewers'].map((tab) => (
          <button
            key={tab}
            className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      <main className="admin-main">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : activeTab === 'viewers' ? (
          <div className="viewers-table">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {viewers.map((viewer) => (
                  <tr key={viewer.id}>
                    <td>{viewer.username || 'Anonymous'}</td>
                    <td>{formatTime(viewer.total_minutes)}</td>
                    <td>
                      {viewer.is_regular ? (
                        <span className="badge badge-regular">Regular</span>
                      ) : (
                        <span className="badge badge-pending">New</span>
                      )}
                    </td>
                    <td>{formatDate(viewer.created_at)}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${viewer.is_regular ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleToggleRegular(viewer.id)}
                        disabled={actionLoading === viewer.id}
                      >
                        {viewer.is_regular ? 'Demote' : 'Promote'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="requests-list">
            {requests.length === 0 ? (
              <p className="empty-state">No {activeTab} requests</p>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="request-card">
                  <div className="request-header">
                    <span className="request-type">{req.type === 'song' ? '🎵 Song' : '💬 Message'}</span>
                    <span className={`badge badge-${req.status}`}>{req.status}</span>
                  </div>
                  <div className="request-content">
                    <p className="request-text">{req.content}</p>
                    {req.artist && <p className="request-artist">by {req.artist}</p>}
                  </div>
                  <div className="request-meta">
                    <span>From: {req.viewer?.username || 'Anonymous'}</span>
                    {req.viewer?.is_regular && <span className="badge badge-regular">Regular</span>}
                    <span>Time: {formatTime(req.viewer?.total_minutes || 0)}</span>
                    <span>{formatDate(req.created_at)}</span>
                  </div>
                  {req.status === 'pending' && (
                    <div className="request-actions">
                      <button
                        className="btn btn-success"
                        onClick={() => handleApprove(req.id)}
                        disabled={actionLoading === req.id}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoading === req.id}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Admin;

