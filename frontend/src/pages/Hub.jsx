import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVisibility } from '../hooks/useVisibility';
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime';
import { 
  logTime, 
  getViewer, 
  setUsername, 
  searchTracks, 
  submitRequest, 
  getApprovedRequests 
} from '../services/api';
import './Hub.css';

function Hub() {
  const navigate = useNavigate();
  const [viewer, setViewer] = useState(null);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('request');

  const viewerId = localStorage.getItem('viewerId');

  useEffect(() => {
    if (!sessionStorage.getItem('viewerPassword')) {
      navigate('/');
      return;
    }
    loadViewer();
    loadApprovedRequests();
  }, [navigate]);

  const loadViewer = async () => {
    if (!viewerId) return;
    const { viewer } = await getViewer(viewerId);
    setViewer(viewer);
    if (viewer && !viewer.username) {
      setShowUsernamePrompt(true);
    }
  };

  const loadApprovedRequests = async () => {
    const { requests } = await getApprovedRequests();
    setApprovedRequests(requests || []);
  };

  const handleLogTime = useCallback(async () => {
    if (!viewerId) return;
    const result = await logTime(viewerId);
    if (result.viewer) {
      setViewer(result.viewer);
      if (result.promoted) {
        setFeedback({ type: 'success', message: '🎉 You are now a Regular! Your song requests will be auto-approved!' });
      }
    }
  }, [viewerId]);

  useVisibility(handleLogTime, 60000);

  useSupabaseRealtime('requests', '*', (payload) => {
    if (payload.eventType === 'INSERT' && payload.new.status === 'approved') {
      setApprovedRequests(prev => [payload.new, ...prev].slice(0, 50));
    } else if (payload.eventType === 'UPDATE' && payload.new.status === 'approved') {
      setApprovedRequests(prev => {
        const exists = prev.find(r => r.id === payload.new.id);
        if (exists) {
          return prev.map(r => r.id === payload.new.id ? payload.new : r);
        }
        return [payload.new, ...prev].slice(0, 50);
      });
    }
  });

  const handleSetUsername = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    const result = await setUsername(viewerId, usernameInput.trim());
    if (result.viewer) {
      setViewer(result.viewer);
      setShowUsernamePrompt(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { tracks } = await searchTracks(searchQuery);
      setSearchResults(tracks || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmitSong = async () => {
    if (!selectedTrack) return;
    setSubmitting(true);
    try {
      const result = await submitRequest({
        viewerId,
        type: 'song',
        content: selectedTrack.name,
        spotifyUri: selectedTrack.uri,
        artist: selectedTrack.artist,
      });
      setFeedback({ type: result.autoApproved ? 'success' : 'info', message: result.message });
      setSelectedTrack(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to submit request' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const result = await submitRequest({
        viewerId,
        type: 'message',
        content: message.trim(),
      });
      setFeedback({ type: 'info', message: result.message });
      setMessage('');
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to submit message' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (showUsernamePrompt) {
    return (
      <div className="hub-container">
        <div className="username-prompt card fade-in">
          <h2>Welcome to WyldePhyre!</h2>
          <p>Choose a display name (optional)</p>
          <form onSubmit={handleSetUsername}>
            <input
              type="text"
              className="input"
              placeholder="Enter username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              maxLength={30}
              autoFocus
            />
            <div className="username-actions">
              <button type="submit" className="btn btn-primary">Set Name</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowUsernamePrompt(false)}>
                Skip
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="hub-container">
      <header className="hub-header">
        <div className="hub-logo">
          <span className="logo-wylde">WYLDE</span>
          <span className="logo-phyre">PHYRE</span>
        </div>
        <div className="hub-user-info">
          <span className="username">{viewer?.username || 'Anonymous'}</span>
          {viewer?.is_regular && <span className="badge badge-regular">Regular</span>}
          <span className="time-badge">{formatTime(viewer?.total_minutes || 0)}</span>
        </div>
      </header>

      {feedback && (
        <div className={`feedback feedback-${feedback.type} fade-in`}>
          {feedback.message}
          <button onClick={() => setFeedback(null)}>×</button>
        </div>
      )}

      <div className="hub-tabs">
        <button 
          className={`tab ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          Request
        </button>
        <button 
          className={`tab ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          Live Feed
        </button>
      </div>

      <main className="hub-main">
        {activeTab === 'request' ? (
          <div className="request-section fade-in">
            <div className="card search-card">
              <h3>🎵 Request a Song</h3>
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  className="input"
                  placeholder="Search for a song..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={searching}>
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((track) => (
                    <div 
                      key={track.uri} 
                      className={`track-item ${selectedTrack?.uri === track.uri ? 'selected' : ''}`}
                      onClick={() => setSelectedTrack(track)}
                    >
                      {track.albumArt && <img src={track.albumArt} alt="" className="track-art" />}
                      <div className="track-info">
                        <span className="track-name">{track.name}</span>
                        <span className="track-artist">{track.artist}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedTrack && (
                <div className="selected-track">
                  <p>Selected: <strong>{selectedTrack.name}</strong> by {selectedTrack.artist}</p>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSubmitSong}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              )}
            </div>

            <div className="card message-card">
              <h3>💬 Send a Message</h3>
              <form onSubmit={handleSubmitMessage}>
                <textarea
                  className="input message-input"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                <button type="submit" className="btn btn-secondary" disabled={submitting || !message.trim()}>
                  Send Message
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="feed-section fade-in">
            <div className="card">
              <h3>📡 Live Approved Requests</h3>
              {approvedRequests.length === 0 ? (
                <p className="empty-state">No approved requests yet</p>
              ) : (
                <div className="feed-list">
                  {approvedRequests.map((req) => (
                    <div key={req.id} className="feed-item">
                      <span className="feed-type">{req.type === 'song' ? '🎵' : '💬'}</span>
                      <div className="feed-content">
                        <span className="feed-text">{req.content}</span>
                        {req.artist && <span className="feed-artist">by {req.artist}</span>}
                        <span className="feed-user">— {req.viewer?.username || 'Anonymous'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Hub;

