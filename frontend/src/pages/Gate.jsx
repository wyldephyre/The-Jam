import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { verifyPassword } from '../services/api';
import './Gate.css';

function Gate() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdmin = searchParams.get('admin') === 'true';

  useEffect(() => {
    // Check if already authenticated
    const viewerAuth = sessionStorage.getItem('viewerPassword');
    const adminAuth = sessionStorage.getItem('adminPassword');
    
    if (isAdmin && adminAuth) {
      navigate('/admin');
    } else if (!isAdmin && viewerAuth) {
      navigate('/hub');
    }
  }, [navigate, isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await verifyPassword(password, isAdmin ? 'admin' : 'viewer');
      
      if (result.valid) {
        if (isAdmin) {
          sessionStorage.setItem('adminPassword', password);
          navigate('/admin');
        } else {
          sessionStorage.setItem('viewerPassword', password);
          
          // Ensure viewer has UUID
          let viewerId = localStorage.getItem('viewerId');
          if (!viewerId) {
            viewerId = uuidv4();
            localStorage.setItem('viewerId', viewerId);
          }
          
          navigate('/hub');
        }
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gate-container">
      <div className="gate-bg-effects">
        <div className="gate-orb gate-orb-1"></div>
        <div className="gate-orb gate-orb-2"></div>
      </div>
      
      <div className="gate-card fade-in">
        <div className="gate-logo">
          <span className="logo-wylde">WYLDE</span>
          <span className="logo-phyre">PHYRE</span>
        </div>
        <h2 className="gate-subtitle">
          {isAdmin ? 'Admin Access' : 'Viewer Hub'}
        </h2>
        
        <form onSubmit={handleSubmit} className="gate-form">
          <div className="input-group">
            <input
              type="password"
              className="input gate-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
          
          {error && <p className="gate-error">{error}</p>}
          
          <button 
            type="submit" 
            className="btn btn-primary gate-btn"
            disabled={loading || !password}
          >
            {loading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
        
        {!isAdmin && (
          <p className="gate-admin-link">
            <a href="/?admin=true">Admin Login</a>
          </p>
        )}
      </div>
    </div>
  );
}

export default Gate;

