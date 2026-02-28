// Consolidated CSS from index.css + Gate.css + Hub.css + Admin.css (minified)
export const SHARED_CSS = `:root{--bg-dark:#0a0a0f;--bg-card:#12121a;--bg-card-hover:#1a1a25;--border:#2a2a3a;--primary:#ff4d00;--primary-glow:#ff6a2a;--secondary:#00d4ff;--text:#e8e8ec;--text-muted:#8888a0;--success:#00ff88;--warning:#ffaa00;--danger:#ff4444}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Rajdhani',sans-serif;background:var(--bg-dark);color:var(--text);min-height:100vh;background-image:radial-gradient(ellipse at 20% 20%,rgba(255,77,0,0.08) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(0,212,255,0.06) 0%,transparent 50%)}h1,h2,h3,h4{font-family:'Orbitron',sans-serif;letter-spacing:.05em}button{font-family:'Rajdhani',sans-serif;font-weight:600;cursor:pointer;border:none;transition:all .2s ease}input{font-family:'Rajdhani',sans-serif;font-size:1rem}.container{max-width:1200px;margin:0 auto;padding:2rem}.card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:1.5rem}.btn{padding:.75rem 1.5rem;border-radius:8px;font-size:1rem;text-transform:uppercase;letter-spacing:.05em}.btn-primary{background:linear-gradient(135deg,var(--primary),var(--primary-glow));color:#fff;box-shadow:0 4px 20px rgba(255,77,0,.3)}.btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 25px rgba(255,77,0,.4)}.btn-secondary{background:transparent;border:2px solid var(--secondary);color:var(--secondary)}.btn-secondary:hover{background:var(--secondary);color:var(--bg-dark)}.btn-success{background:var(--success);color:var(--bg-dark)}.btn-danger{background:var(--danger);color:#fff}.input{width:100%;padding:.75rem 1rem;background:var(--bg-dark);border:2px solid var(--border);border-radius:8px;color:var(--text);font-size:1rem;transition:border-color .2s}.input:focus{outline:none;border-color:var(--primary)}.badge{display:inline-block;padding:.25rem .75rem;border-radius:20px;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em}.badge-regular{background:linear-gradient(135deg,var(--primary),var(--warning));color:#fff}.badge-pending{background:var(--warning);color:var(--bg-dark)}.badge-approved{background:var(--success);color:var(--bg-dark)}.badge-rejected{background:var(--danger);color:#fff}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.fade-in{animation:fadeIn .3s ease forwards}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}.pulse{animation:pulse 2s ease-in-out infinite}.gate-container{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}.gate-bg-effects{position:absolute;inset:0;pointer-events:none}.gate-orb{position:absolute;border-radius:50%;filter:blur(80px)}.gate-orb-1{width:400px;height:400px;background:var(--primary);opacity:.15;top:-100px;left:-100px;animation:float 8s ease-in-out infinite}.gate-orb-2{width:300px;height:300px;background:var(--secondary);opacity:.1;bottom:-50px;right:-50px;animation:float 10s ease-in-out infinite reverse}@keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,30px)}}.gate-card{background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:3rem;width:100%;max-width:400px;text-align:center;position:relative;z-index:1;box-shadow:0 20px 60px rgba(0,0,0,.5)}.gate-logo{font-family:'Orbitron',sans-serif;font-size:2.5rem;font-weight:900;margin-bottom:.5rem;display:flex;justify-content:center;gap:.5rem}.logo-wylde{color:var(--text)}.logo-phyre{background:linear-gradient(135deg,var(--primary),var(--primary-glow));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.gate-subtitle{color:var(--text-muted);font-size:1rem;font-weight:400;margin-bottom:2rem;text-transform:uppercase;letter-spacing:.2em}.gate-form{display:flex;flex-direction:column;gap:1rem}.gate-input{text-align:center;font-size:1.1rem;padding:1rem}.gate-btn{width:100%;padding:1rem;font-size:1.1rem}.gate-error{color:var(--danger);font-size:.9rem}.gate-admin-link{margin-top:2rem;font-size:.85rem}.gate-admin-link a{color:var(--text-muted);text-decoration:none;transition:color .2s}.gate-admin-link a:hover{color:var(--secondary)}.hub-container{min-height:100vh;padding:1rem;max-width:800px;margin:0 auto}.hub-header{display:flex;justify-content:space-between;align-items:center;padding:1rem 0;margin-bottom:1rem;border-bottom:1px solid var(--border)}.hub-logo{font-family:'Orbitron',sans-serif;font-size:1.5rem;font-weight:700;display:flex;gap:.3rem}.hub-user-info{display:flex;align-items:center;gap:.75rem}.username{color:var(--text-muted)}.time-badge{background:var(--bg-card);border:1px solid var(--border);padding:.25rem .75rem;border-radius:20px;font-size:.8rem;color:var(--secondary)}.feedback{padding:1rem;border-radius:8px;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center}.feedback-success{background:rgba(0,255,136,.1);border:1px solid var(--success);color:var(--success)}.feedback-info{background:rgba(0,212,255,.1);border:1px solid var(--secondary);color:var(--secondary)}.feedback-error{background:rgba(255,68,68,.1);border:1px solid var(--danger);color:var(--danger)}.feedback button{background:none;border:none;color:inherit;font-size:1.5rem;cursor:pointer;padding:0 .5rem}.hub-tabs{display:flex;gap:.5rem;margin-bottom:1.5rem}.tab{flex:1;padding:.75rem;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);font-size:1rem;text-transform:uppercase;letter-spacing:.05em}.tab.active{background:var(--primary);border-color:var(--primary);color:#fff}.tab:hover:not(.active){border-color:var(--primary);color:var(--text)}.request-section{display:flex;flex-direction:column;gap:1.5rem}.search-card h3,.message-card h3{margin-bottom:1rem;font-size:1.1rem}.search-form{display:flex;gap:.5rem}.search-form .input{flex:1}.search-results{margin-top:1rem;max-height:300px;overflow-y:auto}.track-item{display:flex;align-items:center;gap:.75rem;padding:.75rem;border-radius:8px;cursor:pointer;transition:background .2s}.track-item:hover{background:var(--bg-card-hover)}.track-item.selected{background:rgba(255,77,0,.15);border:1px solid var(--primary)}.track-art{width:48px;height:48px;border-radius:4px;object-fit:cover}.track-info{display:flex;flex-direction:column}.track-name{font-weight:600}.track-artist{font-size:.85rem;color:var(--text-muted)}.selected-track{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}.message-input{resize:vertical;min-height:80px;margin-bottom:1rem}.feed-section .card h3{margin-bottom:1rem}.empty-state{color:var(--text-muted);text-align:center;padding:2rem}.feed-list{display:flex;flex-direction:column;gap:.75rem}.feed-item{display:flex;gap:.75rem;padding:.75rem;background:var(--bg-dark);border-radius:8px}.feed-type{font-size:1.25rem}.feed-content{display:flex;flex-direction:column;gap:.25rem}.feed-text{font-weight:500}.feed-artist{font-size:.85rem;color:var(--text-muted)}.feed-user{font-size:.8rem;color:var(--secondary)}.username-prompt{max-width:400px;margin:0 auto;margin-top:20vh;text-align:center}.username-prompt h2{margin-bottom:.5rem}.username-prompt p{color:var(--text-muted);margin-bottom:1.5rem}.username-prompt .input{margin-bottom:1rem}.username-actions{display:flex;gap:.5rem}.username-actions button{flex:1}.admin-container{min-height:100vh;padding:1.5rem;max-width:1200px;margin:0 auto}.admin-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;padding-bottom:1rem;border-bottom:1px solid var(--border)}.admin-title h1{font-size:1.75rem;margin-bottom:.25rem}.admin-subtitle{color:var(--text-muted);font-size:.9rem}.admin-actions{display:flex;gap:.75rem}.admin-tabs{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap}.admin-tab{padding:.6rem 1.25rem;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);font-size:.9rem;text-transform:uppercase;letter-spacing:.05em}.admin-tab.active{background:var(--primary);border-color:var(--primary);color:#fff}.admin-tab:hover:not(.active){border-color:var(--primary);color:var(--text)}.loading{text-align:center;padding:3rem;color:var(--text-muted)}.requests-list{display:flex;flex-direction:column;gap:1rem}.request-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:1.25rem}.request-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem}.request-type{font-weight:600;font-size:.9rem}.request-content{margin-bottom:.75rem}.request-text{font-size:1.1rem;margin-bottom:.25rem}.request-artist{color:var(--text-muted);font-size:.9rem}.request-meta{display:flex;gap:1rem;flex-wrap:wrap;font-size:.8rem;color:var(--text-muted);margin-bottom:1rem;align-items:center}.request-actions{display:flex;gap:.5rem}.viewers-table{overflow-x:auto}.viewers-table table{width:100%;border-collapse:collapse;background:var(--bg-card);border-radius:12px;overflow:hidden}.viewers-table th,.viewers-table td{padding:1rem;text-align:left;border-bottom:1px solid var(--border)}.viewers-table th{background:var(--bg-dark);font-family:'Orbitron',sans-serif;font-size:.8rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted)}.viewers-table tr:hover{background:var(--bg-card-hover)}.btn-sm{padding:.4rem .75rem;font-size:.8rem}`;

export function htmlPage(title: string, body: string, script: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>${SHARED_CSS}</style>
</head>
<body>
${body}
<script>${script}</script>
</body>
</html>`;
}

export const GATE_BODY = `
<div class="gate-container">
  <div class="gate-bg-effects">
    <div class="gate-orb gate-orb-1"></div>
    <div class="gate-orb gate-orb-2"></div>
  </div>
  <div class="gate-card fade-in">
    <div class="gate-logo">
      <span class="logo-wylde">WYLDE</span>
      <span class="logo-phyre">PHYRE</span>
    </div>
    <h2 class="gate-subtitle" id="gate-subtitle">Viewer Hub</h2>
    <form id="gate-form" class="gate-form">
      <div class="input-group">
        <input type="password" class="input gate-input" id="gate-password" placeholder="Enter password" autocomplete="off"/>
      </div>
      <p class="gate-error" id="gate-error" style="display:none"></p>
      <button type="submit" class="btn btn-primary gate-btn" id="gate-btn">Enter</button>
    </form>
    <p class="gate-admin-link" id="gate-admin-link" style="display:none"><a href="/?admin=true">Admin Login</a></p>
  </div>
</div>`;

export const GATE_SCRIPT = `
(function(){
  var isAdmin = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === 'true');
  if (sessionStorage.getItem('viewerPassword') && !isAdmin) { window.location.href = '/hub'; return; }
  if (sessionStorage.getItem('adminPassword') && isAdmin) { window.location.href = '/admin'; return; }
  var subtitle = document.getElementById('gate-subtitle');
  var adminLink = document.getElementById('gate-admin-link');
  if (subtitle) subtitle.textContent = isAdmin ? 'Admin Access' : 'Viewer Hub';
  if (adminLink) adminLink.style.display = isAdmin ? 'none' : 'block';
  document.getElementById('gate-form').onsubmit = function(e) {
    e.preventDefault();
    var password = document.getElementById('gate-password').value;
    var errEl = document.getElementById('gate-error');
    var btn = document.getElementById('gate-btn');
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password, type: isAdmin ? 'admin' : 'viewer' })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.valid) {
        if (isAdmin) {
          sessionStorage.setItem('adminPassword', password);
          window.location.href = '/admin';
        } else {
          sessionStorage.setItem('viewerPassword', password);
          if (!localStorage.getItem('viewerId')) localStorage.setItem('viewerId', crypto.randomUUID());
          window.location.href = '/hub';
        }
      } else {
        errEl.textContent = 'Invalid password';
        errEl.style.display = 'block';
      }
    }).catch(function() {
      errEl.textContent = 'Connection error. Please try again.';
      errEl.style.display = 'block';
    }).finally(function() {
      btn.disabled = false;
      btn.textContent = 'Enter';
    });
  };
})();`;

export const HUB_BODY = `
<div class="hub-container" id="hub-container">
  <div class="username-prompt card fade-in" id="username-prompt" style="display:none">
    <h2>Welcome to WyldePhyre!</h2>
    <p>Choose a display name (optional)</p>
    <form id="username-form">
      <input type="text" class="input" id="username-input" placeholder="Enter username" maxlength="30" autocomplete="off"/>
      <div class="username-actions">
        <button type="submit" class="btn btn-primary">Set Name</button>
        <button type="button" class="btn btn-secondary" id="username-skip">Skip</button>
      </div>
    </form>
  </div>
  <div id="hub-main" style="display:none">
    <header class="hub-header">
      <div class="hub-logo"><span class="logo-wylde">WYLDE</span><span class="logo-phyre">PHYRE</span></div>
      <div class="hub-user-info">
        <span class="username" id="hub-username">Anonymous</span>
        <span class="badge badge-regular" id="hub-regular-badge" style="display:none">Regular</span>
        <span class="time-badge" id="hub-time">0m</span>
      </div>
    </header>
    <div class="feedback feedback-success fade-in" id="hub-feedback" style="display:none"><span id="hub-feedback-msg"></span><button type="button" id="hub-feedback-close">×</button></div>
    <div class="hub-tabs">
      <button type="button" class="tab active" data-tab="request">Request</button>
      <button type="button" class="tab" data-tab="feed">Live Feed</button>
    </div>
    <main class="hub-main">
      <div class="request-section fade-in" id="hub-request-section">
        <div class="card search-card">
          <h3>Request a Song</h3>
          <form class="search-form" id="search-form">
            <input type="text" class="input" id="search-query" placeholder="Search for a song..."/>
            <button type="submit" class="btn btn-primary" id="search-btn">Search</button>
          </form>
          <div class="search-results" id="search-results"></div>
          <div class="selected-track" id="selected-track" style="display:none">
            <p>Selected: <strong id="selected-name"></strong> by <span id="selected-artist"></span></p>
            <button type="button" class="btn btn-primary" id="submit-song-btn">Submit Request</button>
          </div>
        </div>
        <div class="card message-card">
          <h3>Send a Message</h3>
          <form id="message-form">
            <textarea class="input message-input" id="message-input" placeholder="Type your message..." maxlength="500" rows="3"></textarea>
            <button type="submit" class="btn btn-secondary" id="message-btn" disabled>Send Message</button>
          </form>
        </div>
      </div>
      <div class="feed-section fade-in" id="hub-feed-section" style="display:none">
        <div class="card">
          <h3>Live Approved Requests</h3>
          <p class="empty-state" id="feed-empty">No approved requests yet</p>
          <div class="feed-list" id="feed-list" style="display:none"></div>
        </div>
      </div>
    </main>
  </div>
</div>`;

export const HUB_SCRIPT = `
function formatTime(m) {
  var h = Math.floor(m / 60), mins = m % 60;
  return h > 0 ? h + 'h ' + mins + 'm' : mins + 'm';
}
function getViewerHeaders() {
  return { 'Content-Type': 'application/json', 'x-viewer-password': sessionStorage.getItem('viewerPassword') };
}
(function(){
  if (!sessionStorage.getItem('viewerPassword')) { window.location.href = '/'; return; }
  var viewerId = localStorage.getItem('viewerId');
  if (!viewerId) { viewerId = crypto.randomUUID(); localStorage.setItem('viewerId', viewerId); }
  var state = { viewer: null, approvedRequests: [], activeTab: 'request', selectedTrack: null };
  function loadViewer() {
    fetch('/api/time/viewer/' + viewerId, { headers: getViewerHeaders() }).then(function(r) { return r.json(); }).then(function(data) {
      state.viewer = data.viewer;
      if (data.viewer) {
        document.getElementById('hub-username').textContent = data.viewer.username || 'Anonymous';
        document.getElementById('hub-regular-badge').style.display = data.viewer.is_regular ? 'inline-block' : 'none';
        document.getElementById('hub-time').textContent = formatTime(data.viewer.total_minutes || 0);
        if (!data.viewer.username) {
          document.getElementById('username-prompt').style.display = 'block';
          document.getElementById('hub-main').style.display = 'none';
          return;
        }
      }
      document.getElementById('username-prompt').style.display = 'none';
      document.getElementById('hub-main').style.display = 'block';
    });
  }
  function loadApproved() {
    fetch('/api/requests/approved', { headers: getViewerHeaders() }).then(function(r) { return r.json(); }).then(function(data) {
      state.approvedRequests = data.requests || [];
      renderFeed();
    });
  }
  function renderFeed() {
    var list = document.getElementById('feed-list');
    var empty = document.getElementById('feed-empty');
    if (state.approvedRequests.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    list.style.display = 'block';
    list.innerHTML = state.approvedRequests.slice(0, 50).map(function(req) {
      return '<div class="feed-item"><span class="feed-type">' + (req.type === 'song' ? '&#127925;' : '&#128172;') + '</span><div class="feed-content"><span class="feed-text">' + (req.content || '').replace(/</g,'&lt;') + '</span>' + (req.artist ? '<span class="feed-artist">by ' + (req.artist || '').replace(/</g,'&lt;') + '</span>' : '') + '<span class="feed-user">— ' + (req.viewer && req.viewer.username ? (req.viewer.username).replace(/</g,'&lt;') : 'Anonymous') + '</span></div></div>';
    }).join('');
  }
  loadViewer();
  loadApproved();
  var es = new EventSource('/api/events');
  es.addEventListener('request', function(e) {
    var req = JSON.parse(e.data);
    state.approvedRequests = [req].concat(state.approvedRequests).slice(0, 50);
    renderFeed();
  });
  setInterval(function() {
    if (document.visibilityState !== 'visible') return;
    fetch('/api/time/log', { method: 'POST', headers: getViewerHeaders(), body: JSON.stringify({ viewerId: viewerId }) }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.viewer) {
        state.viewer = data.viewer;
        document.getElementById('hub-username').textContent = data.viewer.username || 'Anonymous';
        document.getElementById('hub-regular-badge').style.display = data.viewer.is_regular ? 'inline-block' : 'none';
        document.getElementById('hub-time').textContent = formatTime(data.viewer.total_minutes || 0);
        if (data.promoted) {
          var fb = document.getElementById('hub-feedback');
          document.getElementById('hub-feedback-msg').textContent = 'You are now a Regular! Your song requests will be auto-approved!';
          fb.className = 'feedback feedback-success fade-in';
          fb.style.display = 'flex';
          setTimeout(function() { fb.style.display = 'none'; }, 5000);
        }
      }
    });
  }, 60000);
  document.querySelectorAll('.hub-tabs .tab').forEach(function(btn) {
    btn.onclick = function() {
      var t = btn.getAttribute('data-tab');
      state.activeTab = t;
      document.querySelectorAll('.hub-tabs .tab').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-tab') === t); });
      document.getElementById('hub-request-section').style.display = t === 'request' ? 'flex' : 'none';
      document.getElementById('hub-feed-section').style.display = t === 'feed' ? 'block' : 'none';
    };
  });
  document.getElementById('username-form').onsubmit = function(e) {
    e.preventDefault();
    var name = document.getElementById('username-input').value.trim();
    if (!name) return;
    fetch('/api/time/set-username', { method: 'POST', headers: getViewerHeaders(), body: JSON.stringify({ viewerId: viewerId, username: name }) }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.viewer) { state.viewer = data.viewer; loadViewer(); }
    });
  };
  document.getElementById('username-skip').onclick = function() {
    document.getElementById('username-prompt').style.display = 'none';
    document.getElementById('hub-main').style.display = 'block';
  };
  document.getElementById('search-form').onsubmit = function(e) {
    e.preventDefault();
    var q = document.getElementById('search-query').value.trim();
    if (!q) return;
    document.getElementById('search-btn').disabled = true;
    document.getElementById('search-btn').textContent = 'Searching...';
    fetch('/api/requests/search?q=' + encodeURIComponent(q), { headers: getViewerHeaders() }).then(function(r) { return r.json(); }).then(function(data) {
      var res = document.getElementById('search-results');
      res.innerHTML = (data.tracks || []).map(function(t) {
        return '<div class="track-item" data-uri="' + (t.uri||'').replace(/"/g,'&quot;') + '" data-name="' + (t.name||'').replace(/"/g,'&quot;') + '" data-artist="' + (t.artist||'').replace(/"/g,'&quot;') + '"><img src="' + (t.albumArt || '').replace(/"/g,'&quot;') + '" alt="" class="track-art" onerror="this.style.display=\\'none\\'"/><div class="track-info"><span class="track-name">' + (t.name||'').replace(/</g,'&lt;') + '</span><span class="track-artist">' + (t.artist||'').replace(/</g,'&lt;') + '</span></div></div>';
      }).join('');
      res.querySelectorAll('.track-item').forEach(function(el) {
        el.onclick = function() {
          state.selectedTrack = { uri: el.getAttribute('data-uri'), name: el.getAttribute('data-name'), artist: el.getAttribute('data-artist') };
          document.querySelectorAll('.track-item').forEach(function(x) { x.classList.remove('selected'); });
          el.classList.add('selected');
          document.getElementById('selected-track').style.display = 'flex';
          document.getElementById('selected-name').textContent = state.selectedTrack.name;
          document.getElementById('selected-artist').textContent = state.selectedTrack.artist;
        };
      });
    }).finally(function() {
      document.getElementById('search-btn').disabled = false;
      document.getElementById('search-btn').textContent = 'Search';
    });
  };
  document.getElementById('submit-song-btn').onclick = function() {
    if (!state.selectedTrack) return;
    document.getElementById('submit-song-btn').disabled = true;
    document.getElementById('submit-song-btn').textContent = 'Submitting...';
    fetch('/api/requests/submit', { method: 'POST', headers: getViewerHeaders(), body: JSON.stringify({ viewerId: viewerId, type: 'song', content: state.selectedTrack.name, spotifyUri: state.selectedTrack.uri, artist: state.selectedTrack.artist }) }).then(function(r) { return r.json(); }).then(function(data) {
      var fb = document.getElementById('hub-feedback');
      document.getElementById('hub-feedback-msg').textContent = data.message || '';
      fb.className = 'feedback feedback-' + (data.autoApproved ? 'success' : 'info') + ' fade-in';
      fb.style.display = 'flex';
      state.selectedTrack = null;
      document.getElementById('selected-track').style.display = 'none';
      document.getElementById('search-query').value = '';
      document.getElementById('search-results').innerHTML = '';
    }).catch(function() {
      document.getElementById('hub-feedback-msg').textContent = 'Failed to submit request';
      document.getElementById('hub-feedback').className = 'feedback feedback-error fade-in';
      document.getElementById('hub-feedback').style.display = 'flex';
    }).finally(function() {
      document.getElementById('submit-song-btn').disabled = false;
      document.getElementById('submit-song-btn').textContent = 'Submit Request';
    });
  };
  document.getElementById('message-form').onsubmit = function(e) {
    e.preventDefault();
    var msg = document.getElementById('message-input').value.trim();
    if (!msg) return;
    document.getElementById('message-btn').disabled = true;
    fetch('/api/requests/submit', { method: 'POST', headers: getViewerHeaders(), body: JSON.stringify({ viewerId: viewerId, type: 'message', content: msg }) }).then(function(r) { return r.json(); }).then(function(data) {
      document.getElementById('hub-feedback-msg').textContent = data.message || '';
      document.getElementById('hub-feedback').className = 'feedback feedback-info fade-in';
      document.getElementById('hub-feedback').style.display = 'flex';
      document.getElementById('message-input').value = '';
    }).catch(function() {
      document.getElementById('hub-feedback-msg').textContent = 'Failed to submit message';
      document.getElementById('hub-feedback').className = 'feedback feedback-error fade-in';
      document.getElementById('hub-feedback').style.display = 'flex';
    }).finally(function() { document.getElementById('message-btn').disabled = false; });
  };
  document.getElementById('hub-feedback-close').onclick = function() { document.getElementById('hub-feedback').style.display = 'none'; };
  document.getElementById('message-input').oninput = function() { document.getElementById('message-btn').disabled = !document.getElementById('message-input').value.trim(); };
})();`;

export const ADMIN_BODY = `
<div class="admin-container">
  <header class="admin-header">
    <div class="admin-title">
      <h1>Admin Dashboard</h1>
      <span class="admin-subtitle">WyldePhyre Viewer Hub</span>
    </div>
    <div class="admin-actions">
      <button type="button" class="btn btn-secondary" id="admin-clear-overlay">Clear Overlay</button>
      <button type="button" class="btn btn-danger" id="admin-logout">Logout</button>
    </div>
  </header>
  <nav class="admin-tabs">
    <button type="button" class="admin-tab active" data-tab="pending">Pending</button>
    <button type="button" class="admin-tab" data-tab="approved">Approved</button>
    <button type="button" class="admin-tab" data-tab="rejected">Rejected</button>
    <button type="button" class="admin-tab" data-tab="all">All</button>
    <button type="button" class="admin-tab" data-tab="viewers">Viewers</button>
  </nav>
  <main class="admin-main">
    <div class="loading" id="admin-loading">Loading...</div>
    <div id="admin-requests-wrap" style="display:none">
      <div class="requests-list" id="admin-requests-list"></div>
      <p class="empty-state" id="admin-requests-empty" style="display:none">No requests</p>
    </div>
    <div id="admin-viewers-wrap" style="display:none">
      <div class="viewers-table"><table><thead><tr><th>Username</th><th>Time</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody id="admin-viewers-tbody"></tbody></table></div>
    </div>
  </main>
</div>`;

export const ADMIN_SCRIPT = `
function getAdminHeaders() {
  return { 'Content-Type': 'application/json', 'x-admin-password': sessionStorage.getItem('adminPassword') };
}
function formatTime(m) {
  var h = Math.floor(m / 60), mins = m % 60;
  return h + 'h ' + mins + 'm';
}
function formatDate(s) { return new Date(s).toLocaleString(); }
(function(){
  if (!sessionStorage.getItem('adminPassword')) { window.location.href = '/?admin=true'; return; }
  var state = { activeTab: 'pending', requests: [], viewers: [], loading: true, actionLoading: null };
  function loadData() {
    state.loading = true;
    document.getElementById('admin-loading').style.display = 'block';
    document.getElementById('admin-requests-wrap').style.display = 'none';
    document.getElementById('admin-viewers-wrap').style.display = 'none';
    if (state.activeTab === 'viewers') {
      fetch('/api/admin/viewers', { headers: getAdminHeaders() }).then(function(r) { return r.json(); }).then(function(data) {
        state.viewers = data.viewers || [];
        state.loading = false;
        document.getElementById('admin-loading').style.display = 'none';
        document.getElementById('admin-viewers-wrap').style.display = 'block';
        var tbody = document.getElementById('admin-viewers-tbody');
        tbody.innerHTML = state.viewers.map(function(v) {
          return '<tr><td>' + (v.username || 'Anonymous').replace(/</g,'&lt;') + '</td><td>' + formatTime(v.total_minutes || 0) + '</td><td><span class="badge ' + (v.is_regular ? 'badge-regular">Regular' : 'badge-pending">New') + '</span></td><td>' + formatDate(v.created_at) + '</td><td><button type="button" class="btn btn-sm ' + (v.is_regular ? 'btn-danger' : 'btn-success') + '" data-id="' + v.id + '">' + (v.is_regular ? 'Demote' : 'Promote') + '</button></td></tr>';
        }).join('');
        tbody.querySelectorAll('button').forEach(function(btn) {
          btn.onclick = function() {
            var id = btn.getAttribute('data-id');
            if (state.actionLoading === id) return;
            state.actionLoading = id;
            btn.disabled = true;
            fetch('/api/admin/viewers/' + id + '/toggle-regular', { method: 'POST', headers: getAdminHeaders() }).then(function(r) { return r.json(); }).then(function(data) {
              state.viewers = state.viewers.map(function(v) { return v.id === id ? data.viewer : v; });
              loadData();
            }).finally(function() { state.actionLoading = null; });
          };
        });
      }).finally(function() {
        state.loading = false;
        document.getElementById('admin-loading').style.display = 'none';
      });
    } else {
      var status = state.activeTab === 'all' ? '' : state.activeTab;
      var url = status ? '/api/admin/requests?status=' + status : '/api/admin/requests';
      fetch(url, { headers: getAdminHeaders() }).then(function(r) { return r.json(); }).then(function(data) {
        state.requests = data.requests || [];
        state.loading = false;
        document.getElementById('admin-loading').style.display = 'none';
        document.getElementById('admin-requests-wrap').style.display = 'block';
        var list = document.getElementById('admin-requests-list');
        var empty = document.getElementById('admin-requests-empty');
        if (state.requests.length === 0) {
          list.innerHTML = '';
          empty.style.display = 'block';
          empty.textContent = 'No ' + state.activeTab + ' requests';
          return;
        }
        empty.style.display = 'none';
        list.innerHTML = state.requests.map(function(req) {
          var actions = req.status === 'pending' ? '<div class="request-actions"><button type="button" class="btn btn-success admin-approve" data-id="' + req.id + '">Approve</button><button type="button" class="btn btn-danger admin-reject" data-id="' + req.id + '">Reject</button></div>' : '';
          return '<div class="request-card"><div class="request-header"><span class="request-type">' + (req.type === 'song' ? '&#127925; Song' : '&#128172; Message') + '</span><span class="badge badge-' + req.status + '">' + req.status + '</span></div><div class="request-content"><p class="request-text">' + (req.content||'').replace(/</g,'&lt;') + '</p>' + (req.artist ? '<p class="request-artist">by ' + (req.artist||'').replace(/</g,'&lt;') + '</p>' : '') + '</div><div class="request-meta"><span>From: ' + (req.viewer && req.viewer.username ? (req.viewer.username).replace(/</g,'&lt;') : 'Anonymous') + '</span><span>' + formatDate(req.created_at) + '</span></div>' + actions + '</div>';
        }).join('');
        list.querySelectorAll('.admin-approve').forEach(function(btn) {
          btn.onclick = function() {
            var id = btn.getAttribute('data-id');
            if (state.actionLoading === id) return;
            state.actionLoading = id;
            btn.disabled = true;
            fetch('/api/admin/requests/' + id + '/approve', { method: 'POST', headers: getAdminHeaders() }).then(function(r) { return r.json(); }).then(function(data) {
              state.requests = state.requests.map(function(r) { return r.id === id ? data.request : r; });
              loadData();
            }).finally(function() { state.actionLoading = null; });
          };
        });
        list.querySelectorAll('.admin-reject').forEach(function(btn) {
          btn.onclick = function() {
            var id = btn.getAttribute('data-id');
            if (state.actionLoading === id) return;
            state.actionLoading = id;
            btn.disabled = true;
            fetch('/api/admin/requests/' + id + '/reject', { method: 'POST', headers: getAdminHeaders() }).then(function(r) { return r.json(); }).then(function() {
              state.requests = state.requests.map(function(r) { return r.id === id ? Object.assign({}, r, { status: 'rejected' }) : r; });
              loadData();
            }).finally(function() { state.actionLoading = null; });
          };
        });
      }).finally(function() {
        state.loading = false;
        document.getElementById('admin-loading').style.display = 'none';
      });
    }
  }
  document.querySelectorAll('.admin-tab').forEach(function(btn) {
    btn.onclick = function() {
      state.activeTab = btn.getAttribute('data-tab');
      document.querySelectorAll('.admin-tab').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-tab') === state.activeTab); });
      loadData();
    };
  });
  var es = new EventSource('/api/events');
  es.addEventListener('request', function() {
    if (state.activeTab !== 'viewers') loadData();
  });
  document.getElementById('admin-clear-overlay').onclick = function() {
    fetch('/api/admin/overlay/clear', { method: 'POST', headers: getAdminHeaders() });
  };
  document.getElementById('admin-logout').onclick = function() {
    sessionStorage.removeItem('adminPassword');
    window.location.href = '/?admin=true';
  };
  loadData();
})();`;
