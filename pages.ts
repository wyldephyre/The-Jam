// Consolidated CSS from index.css + Gate.css + Hub.css + Admin.css (minified)
export const SHARED_CSS = `:root{--bg-dark:#0a0a0f;--bg-card:#12121a;--bg-card-hover:#1a1a25;--border:#2a2a3a;--primary:#ff4d00;--primary-glow:#ff6a2a;--secondary:#00d4ff;--text:#e8e8ec;--text-muted:#8888a0;--success:#00ff88;--warning:#ffaa00;--danger:#ff4444}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Rajdhani',sans-serif;background:var(--bg-dark);color:var(--text);min-height:100vh;background-image:radial-gradient(ellipse at 20% 20%,rgba(255,77,0,0.08) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(0,212,255,0.06) 0%,transparent 50%)}h1,h2,h3,h4{font-family:'Orbitron',sans-serif;letter-spacing:.05em}button{font-family:'Rajdhani',sans-serif;font-weight:600;cursor:pointer;border:none;transition:all .2s ease}input{font-family:'Rajdhani',sans-serif;font-size:1rem}.container{max-width:1200px;margin:0 auto;padding:2rem}.card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:1.5rem}.btn{padding:.75rem 1.5rem;border-radius:8px;font-size:1rem;text-transform:uppercase;letter-spacing:.05em}.btn-primary{background:linear-gradient(135deg,var(--primary),var(--primary-glow));color:#fff;box-shadow:0 4px 20px rgba(255,77,0,.3)}.btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 25px rgba(255,77,0,.4)}.btn-secondary{background:transparent;border:2px solid var(--secondary);color:var(--secondary)}.btn-secondary:hover{background:var(--secondary);color:var(--bg-dark)}.btn-success{background:var(--success);color:var(--bg-dark)}.btn-danger{background:var(--danger);color:#fff}.input{width:100%;padding:.75rem 1rem;background:var(--bg-dark);border:2px solid var(--border);border-radius:8px;color:var(--text);font-size:1rem;transition:border-color .2s}.input:focus{outline:none;border-color:var(--primary)}.badge{display:inline-block;padding:.25rem .75rem;border-radius:20px;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em}.badge-regular{background:linear-gradient(135deg,var(--primary),var(--warning));color:#fff}.badge-pending{background:var(--warning);color:var(--bg-dark)}.badge-approved{background:var(--success);color:var(--bg-dark)}.badge-rejected{background:var(--danger);color:#fff}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.fade-in{animation:fadeIn .3s ease forwards}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}.pulse{animation:pulse 2s ease-in-out infinite}.gate-container{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}.gate-bg-effects{position:absolute;inset:0;pointer-events:none}.gate-orb{position:absolute;border-radius:50%;filter:blur(80px)}.gate-orb-1{width:400px;height:400px;background:var(--primary);opacity:.15;top:-100px;left:-100px;animation:float 8s ease-in-out infinite}.gate-orb-2{width:300px;height:300px;background:var(--secondary);opacity:.1;bottom:-50px;right:-50px;animation:float 10s ease-in-out infinite reverse}@keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,30px)}}.gate-card{background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:3rem;width:100%;max-width:400px;text-align:center;position:relative;z-index:1;box-shadow:0 20px 60px rgba(0,0,0,.5)}.gate-logo{font-family:'Orbitron',sans-serif;font-size:2.5rem;font-weight:900;margin-bottom:.5rem;display:flex;justify-content:center;gap:.5rem}.logo-wylde{color:var(--text)}.logo-phyre{background:linear-gradient(135deg,var(--primary),var(--primary-glow));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.gate-subtitle{color:var(--text-muted);font-size:1rem;font-weight:400;margin-bottom:2rem;text-transform:uppercase;letter-spacing:.2em}.gate-form{display:flex;flex-direction:column;gap:1rem}.gate-input{text-align:center;font-size:1.1rem;padding:1rem}.gate-btn{width:100%;padding:1rem;font-size:1.1rem}.gate-error{color:var(--danger);font-size:.9rem}.gate-admin-link{margin-top:2rem;font-size:.85rem}.gate-admin-link a{color:var(--text-muted);text-decoration:none;transition:color .2s}.gate-admin-link a:hover{color:var(--secondary)}.hub-container{min-height:100vh;padding:1rem;max-width:800px;margin:0 auto}.hub-header{display:flex;justify-content:space-between;align-items:center;padding:1rem 0;margin-bottom:1rem;border-bottom:1px solid var(--border)}.hub-logo{font-family:'Orbitron',sans-serif;font-size:1.5rem;font-weight:700;display:flex;gap:.3rem}.hub-user-info{display:flex;align-items:center;gap:.75rem}.username{color:var(--text-muted)}.time-badge{background:var(--bg-card);border:1px solid var(--border);padding:.25rem .75rem;border-radius:20px;font-size:.8rem;color:var(--secondary)}.feedback{padding:1rem;border-radius:8px;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center}.feedback-success{background:rgba(0,255,136,.1);border:1px solid var(--success);color:var(--success)}.feedback-info{background:rgba(0,212,255,.1);border:1px solid var(--secondary);color:var(--secondary)}.feedback-error{background:rgba(255,68,68,.1);border:1px solid var(--danger);color:var(--danger)}.feedback button{background:none;border:none;color:inherit;font-size:1.5rem;cursor:pointer;padding:0 .5rem}.hub-tabs{display:flex;gap:.5rem;margin-bottom:1.5rem}.tab{flex:1;padding:.75rem;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);font-size:1rem;text-transform:uppercase;letter-spacing:.05em}.tab.active{background:var(--primary);border-color:var(--primary);color:#fff}.tab:hover:not(.active){border-color:var(--primary);color:var(--text)}.request-section{display:flex;flex-direction:column;gap:1.5rem}.search-card h3,.message-card h3{margin-bottom:1rem;font-size:1.1rem}.search-form{display:flex;gap:.5rem}.search-form .input{flex:1}.search-results{margin-top:1rem;max-height:300px;overflow-y:auto}.track-item{display:flex;align-items:center;gap:.75rem;padding:.75rem;border-radius:8px;cursor:pointer;transition:background .2s}.track-item:hover{background:var(--bg-card-hover)}.track-item.selected{background:rgba(255,77,0,.15);border:1px solid var(--primary)}.track-art{width:48px;height:48px;border-radius:4px;object-fit:cover}.track-info{display:flex;flex-direction:column}.track-name{font-weight:600}.track-artist{font-size:.85rem;color:var(--text-muted)}.selected-track{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}.message-input{resize:vertical;min-height:80px;margin-bottom:1rem}.feed-section .card h3{margin-bottom:1rem}.empty-state{color:var(--text-muted);text-align:center;padding:2rem}.feed-list{display:flex;flex-direction:column;gap:.75rem}.feed-item{display:flex;gap:.75rem;padding:.75rem;background:var(--bg-dark);border-radius:8px}.feed-type{font-size:1.25rem}.feed-content{display:flex;flex-direction:column;gap:.25rem}.feed-text{font-weight:500}.feed-artist{font-size:.85rem;color:var(--text-muted)}.feed-user{font-size:.8rem;color:var(--secondary)}.username-prompt{max-width:400px;margin:0 auto;margin-top:20vh;text-align:center}.username-prompt h2{margin-bottom:.5rem}.username-prompt p{color:var(--text-muted);margin-bottom:1.5rem}.username-prompt .input{margin-bottom:1rem}.username-actions{display:flex;gap:.5rem}.username-actions button{flex:1}.admin-container{min-height:100vh;padding:1.5rem;max-width:1200px;margin:0 auto}.admin-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;padding-bottom:1rem;border-bottom:1px solid var(--border)}.admin-title h1{font-size:1.75rem;margin-bottom:.25rem}.admin-subtitle{color:var(--text-muted);font-size:.9rem}.admin-actions{display:flex;gap:.75rem}.admin-tabs{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap}.admin-tab{padding:.6rem 1.25rem;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);font-size:.9rem;text-transform:uppercase;letter-spacing:.05em}.admin-tab.active{background:var(--primary);border-color:var(--primary);color:#fff}.admin-tab:hover:not(.active){border-color:var(--primary);color:var(--text)}.loading{text-align:center;padding:3rem;color:var(--text-muted)}.requests-list{display:flex;flex-direction:column;gap:1rem}.request-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:1.25rem}.request-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem}.request-type{font-weight:600;font-size:.9rem}.request-content{margin-bottom:.75rem}.request-text{font-size:1.1rem;margin-bottom:.25rem}.request-artist{color:var(--text-muted);font-size:.9rem}.request-meta{display:flex;gap:1rem;flex-wrap:wrap;font-size:.8rem;color:var(--text-muted);margin-bottom:1rem;align-items:center}.request-actions{display:flex;gap:.5rem}.viewers-table{overflow-x:auto}.viewers-table table{width:100%;border-collapse:collapse;background:var(--bg-card);border-radius:12px;overflow:hidden}.viewers-table th,.viewers-table td{padding:1rem;text-align:left;border-bottom:1px solid var(--border)}.viewers-table th{background:var(--bg-dark);font-family:'Orbitron',sans-serif;font-size:.8rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted)}.viewers-table tr:hover{background:var(--bg-card-hover)}.btn-sm{padding:.4rem .75rem;font-size:.8rem}.chat-section .card h3{margin-bottom:.35rem}.chat-help{color:var(--text-muted);font-size:.85rem;margin-bottom:.75rem}.chat-status{display:inline-flex;align-items:center;gap:.4rem;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:.75rem}.chat-dot{width:.55rem;height:.55rem;border-radius:50%;background:var(--text-muted)}.chat-dot.live{background:var(--success);box-shadow:0 0 8px var(--success)}.chat-dot.wait{background:var(--warning)}.chat-list{display:flex;flex-direction:column;gap:.6rem;max-height:480px;overflow-y:auto}.chat-item{display:flex;gap:.7rem;padding:.7rem;background:var(--bg-dark);border-radius:8px;border-left:3px solid var(--border)}.chat-avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;flex:none}.chat-avatar-fallback{display:flex;align-items:center;justify-content:center;background:var(--bg-card-hover);color:var(--secondary);font-family:'Orbitron',sans-serif;font-size:.8rem}.chat-body{min-width:0;flex:1}.chat-meta{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin-bottom:.2rem}.chat-platform{font-size:.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:.1rem .4rem;border-radius:4px;background:var(--bg-card);color:var(--text)}.platform-twitch{color:#bf94ff}.platform-youtube{color:#ff6b6b}.platform-rumble{color:#b6e36a}.platform-x,.platform-twitter{color:var(--text)}.chat-name{font-weight:700}.chat-donation{color:var(--warning);font-size:.75rem}.chat-event{color:var(--secondary);font-size:.75rem;text-transform:uppercase}.chat-text{white-space:pre-wrap;word-break:break-word}.auth-card{max-width:440px}.auth-card .field{text-align:left}.auth-card .field-label{display:block;text-align:left;font-size:.85rem;color:var(--text-muted);margin-bottom:.35rem;letter-spacing:.04em}.auth-card .gate-subtitle{margin-bottom:.75rem}.field-hint{color:var(--text-muted);font-size:.9rem;margin-bottom:.25rem}.auth-switch{display:flex;gap:.5rem}.hub-logout{background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:.3rem .65rem;border-radius:8px;font-size:.8rem}.hub-logout:hover{border-color:var(--danger);color:var(--danger)}.platform-pill{color:var(--secondary);font-size:.75rem;text-transform:uppercase;letter-spacing:.06em}.refresh-age{color:var(--text-muted);font-size:.8rem;margin:0 0 .75rem;letter-spacing:.03em}`;

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

// One HTML-escape helper for every viewer-supplied string that is rendered as HTML.
// Escapes & < > " ' so it is safe in text nodes AND in quoted attribute values.
// Fallback polls. SSE still pushes sooner when it is connected.
export const PENDING_POLL_MS = 30_000;
export const CHAT_POLL_MS = 5_000;
export const OVERLAY_REFRESH_MS = 12_000;

export const ESC_JS = `
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
`;

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
          window.location.href = '/login';
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
  <div id="hub-main" style="display:none">
    <header class="hub-header">
      <div class="hub-logo"><span class="logo-wylde">WYLDE</span><span class="logo-phyre">PHYRE</span></div>
      <div class="hub-user-info">
        <span class="username" id="hub-username"></span>
        <span class="platform-pill" id="hub-platform"></span>
        <span class="badge badge-regular" id="hub-regular-badge" style="display:none">Regular</span>
        <span class="time-badge" id="hub-time">0m</span>
        <button type="button" class="hub-logout" id="hub-logout">Log out</button>
      </div>
    </header>
    <div class="feedback feedback-success fade-in" id="hub-feedback" style="display:none"><span id="hub-feedback-msg"></span><button type="button" id="hub-feedback-close">×</button></div>
    <div class="hub-tabs">
      <button type="button" class="tab active" data-tab="request">Request</button>
      <button type="button" class="tab" data-tab="feed">Live Feed</button>
      <button type="button" class="tab" data-tab="chat">Live Chat</button>
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
      <div class="chat-section fade-in" id="hub-chat-section" style="display:none">
        <div class="card">
          <h3>Live Chat</h3>
          <p class="chat-help">Twitch, YouTube, Rumble, and X, in one place.</p>
          <div class="chat-status" id="hub-chat-status"><span class="chat-dot" id="hub-chat-dot"></span><span id="hub-chat-status-text">Connecting</span></div>
          <p class="refresh-age" id="hub-chat-age" style="display:none"></p>
          <p class="empty-state" id="hub-chat-empty">No chat messages yet</p>
          <div class="chat-list" id="hub-chat-list" role="log" aria-live="polite" style="display:none"></div>
        </div>
      </div>
    </main>
  </div>
</div>`;

export const LOGIN_BODY = `
<div class="gate-container">
  <div class="gate-bg-effects">
    <div class="gate-orb gate-orb-1"></div>
    <div class="gate-orb gate-orb-2"></div>
  </div>
  <div class="gate-card auth-card fade-in">
    <div class="gate-logo">
      <span class="logo-wylde">WYLDE</span>
      <span class="logo-phyre">PHYRE</span>
    </div>
    <h2 class="gate-subtitle">Viewer account</h2>
    <p class="field-hint">Use the name you chat with on stream. Requests show that name.</p>
    <div class="auth-switch">
      <button type="button" class="tab active" id="show-login">Log in</button>
      <button type="button" class="tab" id="show-signup">Create account</button>
    </div>
    <form id="login-form" class="gate-form">
      <div class="field">
        <label class="field-label" for="login-name">Username</label>
        <input type="text" class="input" id="login-name" maxlength="40" autocomplete="username" required/>
      </div>
      <div class="field">
        <label class="field-label" for="login-password">Password</label>
        <input type="password" class="input" id="login-password" autocomplete="current-password" required/>
      </div>
      <p class="gate-error" id="login-error" style="display:none"></p>
      <button type="submit" class="btn btn-primary gate-btn" id="login-btn">Log in</button>
    </form>
    <form id="signup-form" class="gate-form" style="display:none">
      <div class="field">
        <label class="field-label" for="signup-name">Your Twitch / YouTube / Rumble / X username</label>
        <input type="text" class="input" id="signup-name" maxlength="40" autocomplete="username" required/>
      </div>
      <div class="field">
        <label class="field-label" for="signup-platform">Platform</label>
        <select class="input" id="signup-platform" required>
          <option value="" selected disabled>Choose your platform</option>
          <option value="twitch">Twitch</option>
          <option value="youtube">YouTube</option>
          <option value="rumble">Rumble</option>
          <option value="x">X</option>
          <option value="kick">Kick</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="signup-password">Password</label>
        <input type="password" class="input" id="signup-password" minlength="8" maxlength="200" autocomplete="new-password" required/>
      </div>
      <div class="field">
        <label class="field-label" for="signup-email">Email (optional)</label>
        <input type="email" class="input" id="signup-email" maxlength="254" autocomplete="email"/>
      </div>
      <p class="gate-error" id="signup-error" style="display:none"></p>
      <button type="submit" class="btn btn-primary gate-btn" id="signup-btn">Create account</button>
    </form>
    <p class="gate-admin-link"><a href="/?admin=true">Admin Login</a></p>
  </div>
</div>`;

export const LOGIN_SCRIPT = `
(function(){
  function headers() {
    var h = { 'Content-Type': 'application/json' };
    var pw = sessionStorage.getItem('viewerPassword');
    if (pw) h['x-viewer-password'] = pw;
    return h;
  }
  function showError(id, msg) {
    var el = document.getElementById(id);
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
  }
  fetch('/api/auth/config').then(function(r) { return r.json(); }).then(function(cfg) {
    if (cfg.siteGate && !sessionStorage.getItem('viewerPassword')) {
      window.location.href = '/';
      return null;
    }
    return fetch('/api/auth/me', { headers: headers() }).then(function(r) {
      if (r.ok) window.location.href = '/hub';
    });
  });
  var loginForm = document.getElementById('login-form');
  var signupForm = document.getElementById('signup-form');
  document.getElementById('show-login').onclick = function() {
    loginForm.style.display = 'flex';
    signupForm.style.display = 'none';
    document.getElementById('show-login').classList.add('active');
    document.getElementById('show-signup').classList.remove('active');
  };
  document.getElementById('show-signup').onclick = function() {
    signupForm.style.display = 'flex';
    loginForm.style.display = 'none';
    document.getElementById('show-signup').classList.add('active');
    document.getElementById('show-login').classList.remove('active');
  };
  loginForm.onsubmit = function(e) {
    e.preventDefault();
    var btn = document.getElementById('login-btn');
    btn.disabled = true;
    showError('login-error', '');
    fetch('/api/auth/login', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        displayName: document.getElementById('login-name').value,
        password: document.getElementById('login-password').value
      })
    }).then(function(r) {
      return r.json().then(function(data) { return { ok: r.ok, data: data }; });
    }).then(function(res) {
      if (!res.ok) { showError('login-error', res.data.error || 'Could not log in'); return; }
      window.location.href = '/hub';
    }).catch(function() {
      showError('login-error', 'Connection error. Please try again.');
    }).finally(function() { btn.disabled = false; });
  };
  signupForm.onsubmit = function(e) {
    e.preventDefault();
    var btn = document.getElementById('signup-btn');
    btn.disabled = true;
    showError('signup-error', '');
    var email = document.getElementById('signup-email').value.trim();
    var body = {
      displayName: document.getElementById('signup-name').value,
      platform: document.getElementById('signup-platform').value,
      password: document.getElementById('signup-password').value
    };
    if (email) body.email = email;
    fetch('/api/auth/signup', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body)
    }).then(function(r) {
      return r.json().then(function(data) { return { ok: r.ok, data: data }; });
    }).then(function(res) {
      if (!res.ok) { showError('signup-error', res.data.error || 'Could not create account'); return; }
      window.location.href = '/hub';
    }).catch(function() {
      showError('signup-error', 'Connection error. Please try again.');
    }).finally(function() { btn.disabled = false; });
  };
})();`;

export const HUB_SCRIPT = ESC_JS + `
function formatTime(m) {
  var h = Math.floor(m / 60), mins = m % 60;
  return h > 0 ? h + 'h ' + mins + 'm' : mins + 'm';
}
function getViewerHeaders() {
  var headers = { 'Content-Type': 'application/json' };
  var pw = sessionStorage.getItem('viewerPassword');
  if (pw) headers['x-viewer-password'] = pw;
  return headers;
}
function showFeedback(msg, kind) {
  var fb = document.getElementById('hub-feedback');
  document.getElementById('hub-feedback-msg').textContent = msg || '';
  fb.className = 'feedback feedback-' + kind + ' fade-in';
  fb.style.display = 'flex';
}
function applyUser(user) {
  document.getElementById('hub-username').textContent = user.displayName || 'Viewer';
  document.getElementById('hub-platform').textContent = user.platform || '';
  document.getElementById('hub-regular-badge').style.display = user.isRegular ? 'inline-block' : 'none';
  document.getElementById('hub-time').textContent = formatTime(user.totalMinutes || 0);
}
function readJson(r) {
  return r.json().then(function(data) { return { ok: r.ok, status: r.status, data: data }; }).catch(function() {
    return { ok: false, status: r.status, data: {} };
  });
}
(function(){
  var state = { user: null, approvedRequests: [], activeTab: 'request', selectedTrack: null };
  fetch('/api/auth/config').then(function(r) { return r.json(); }).then(function(cfg) {
    if (cfg.siteGate && !sessionStorage.getItem('viewerPassword')) {
      window.location.href = '/';
      return null;
    }
    return fetch('/api/auth/me', { headers: getViewerHeaders() }).then(function(r) {
      if (!r.ok) { window.location.href = '/login'; return null; }
      return r.json();
    });
  }).then(function(data) {
    if (!data || !data.user) return;
    state.user = data.user;
    applyUser(data.user);
    document.getElementById('hub-main').style.display = 'block';
    loadApproved();
    bindUi();
  }).catch(function() {
    window.location.href = '/login';
  });
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
      var name = req.viewer && req.viewer.username ? req.viewer.username : 'Anonymous';
      var platform = req.viewer && req.viewer.platform ? ' (' + req.viewer.platform + ')' : '';
      return '<div class="feed-item"><span class="feed-type">' + (req.type === 'song' ? '&#127925;' : '&#128172;') + '</span><div class="feed-content"><span class="feed-text">' + esc(req.content || '') + '</span>' + (req.artist ? '<span class="feed-artist">by ' + esc(req.artist || '') + '</span>' : '') + '<span class="feed-user">— ' + esc(name) + esc(platform) + '</span></div></div>';
    }).join('');
  }
  function bindUi() {
  var es = new EventSource('/api/events');
  es.addEventListener('request', function(e) {
    var req = JSON.parse(e.data);
    if (!req || req.status !== 'approved') return;
    state.approvedRequests = [req].concat(state.approvedRequests).slice(0, 50);
    renderFeed();
  });
  setInterval(function() {
    if (document.visibilityState !== 'visible') return;
    fetch('/api/time/log', { method: 'POST', headers: getViewerHeaders(), body: '{}' }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.viewer && state.user) {
        state.user.totalMinutes = data.viewer.total_minutes || 0;
        state.user.isRegular = !!data.viewer.is_regular;
        applyUser(state.user);
        if (data.promoted) showFeedback('You are now a Regular! Your song requests will be auto-approved!', 'success');
      }
    });
  }, 60000);
  document.getElementById('hub-logout').onclick = function() {
    fetch('/api/auth/logout', { method: 'POST', headers: getViewerHeaders() }).finally(function() {
      window.location.href = '/login';
    });
  };
  document.querySelectorAll('.hub-tabs .tab').forEach(function(btn) {
    btn.onclick = function() {
      var t = btn.getAttribute('data-tab');
      state.activeTab = t;
      document.querySelectorAll('.hub-tabs .tab').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-tab') === t); });
      document.getElementById('hub-request-section').style.display = t === 'request' ? 'flex' : 'none';
      document.getElementById('hub-feed-section').style.display = t === 'feed' ? 'block' : 'none';
      document.getElementById('hub-chat-section').style.display = t === 'chat' ? 'block' : 'none';
    };
  });
  document.getElementById('search-form').onsubmit = function(e) {
    e.preventDefault();
    var q = document.getElementById('search-query').value.trim();
    if (!q) return;
    document.getElementById('search-btn').disabled = true;
    document.getElementById('search-btn').textContent = 'Searching...';
    fetch('/api/requests/search?q=' + encodeURIComponent(q), { headers: getViewerHeaders() }).then(function(r) { return r.json(); }).then(function(data) {
      var res = document.getElementById('search-results');
      res.innerHTML = (data.tracks || []).map(function(t) {
        return '<div class="track-item" data-uri="' + esc(t.uri||'') + '" data-name="' + esc(t.name||'') + '" data-artist="' + esc(t.artist||'') + '"><img src="' + esc(t.albumArt || '') + '" alt="" class="track-art" onerror="this.style.display=\\'none\\'"/><div class="track-info"><span class="track-name">' + esc(t.name||'') + '</span><span class="track-artist">' + esc(t.artist||'') + '</span></div></div>';
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
    fetch('/api/requests/submit', { method: 'POST', headers: getViewerHeaders(), body: JSON.stringify({ type: 'song', content: state.selectedTrack.name, spotifyUri: state.selectedTrack.uri, artist: state.selectedTrack.artist }) }).then(readJson).then(function(res) {
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) { showFeedback(res.data.error || 'Failed to submit request', 'error'); return; }
      showFeedback(res.data.message || '', res.data.autoApproved ? 'success' : 'info');
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
    fetch('/api/requests/submit', { method: 'POST', headers: getViewerHeaders(), body: JSON.stringify({ type: 'message', content: msg }) }).then(readJson).then(function(res) {
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) { showFeedback(res.data.error || 'Failed to submit message', 'error'); return; }
      showFeedback(res.data.message || '', 'info');
      document.getElementById('message-input').value = '';
    }).catch(function() {
      document.getElementById('hub-feedback-msg').textContent = 'Failed to submit message';
      document.getElementById('hub-feedback').className = 'feedback feedback-error fade-in';
      document.getElementById('hub-feedback').style.display = 'flex';
    }).finally(function() { document.getElementById('message-btn').disabled = false; });
  };
  document.getElementById('hub-feedback-close').onclick = function() { document.getElementById('hub-feedback').style.display = 'none'; };
  document.getElementById('message-input').oninput = function() { document.getElementById('message-btn').disabled = !document.getElementById('message-input').value.trim(); };
  }
})();` + liveChatScript({
  passwordHeader: "x-viewer-password",
  storageKey: "viewerPassword",
  statusId: "hub-chat-status-text",
  dotId: "hub-chat-dot",
  listId: "hub-chat-list",
  emptyId: "hub-chat-empty",
  ageId: "hub-chat-age",
});

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
    <button type="button" class="admin-tab" data-tab="accounts">Accounts</button>
    <button type="button" class="admin-tab" data-tab="chat">Live Chat</button>
  </nav>
  <main class="admin-main">
    <div class="loading" id="admin-loading">Loading...</div>
    <div id="admin-requests-wrap" style="display:none">
      <p class="refresh-age" id="admin-pending-age" style="display:none"></p>
      <div class="requests-list" id="admin-requests-list"></div>
      <p class="empty-state" id="admin-requests-empty" style="display:none">No requests</p>
    </div>
    <div id="admin-viewers-wrap" style="display:none">
      <div class="viewers-table"><table><thead><tr><th>Username</th><th>Time</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody id="admin-viewers-tbody"></tbody></table></div>
    </div>
    <div id="admin-accounts-wrap" style="display:none">
      <div class="viewers-table"><table><thead><tr><th>Username</th><th>Platform</th><th>Email</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody id="admin-accounts-tbody"></tbody></table></div>
    </div>
    <div class="chat-section" id="admin-chat-wrap" style="display:none">
      <div class="card">
        <h3>Consolidated live chat</h3>
        <p class="chat-help">Relayed on the server from Social Stream Ninja. The session id never reaches this page.</p>
        <div class="chat-status" id="admin-chat-status"><span class="chat-dot" id="admin-chat-dot"></span><span id="admin-chat-status-text">Connecting</span></div>
        <p class="refresh-age" id="admin-chat-age" style="display:none"></p>
        <p class="empty-state" id="admin-chat-empty">No chat messages yet</p>
        <div class="chat-list" id="admin-chat-list" role="log" aria-live="polite" style="display:none"></div>
      </div>
    </div>
  </main>
</div>`;

export const ADMIN_SCRIPT = ESC_JS + `
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
  var state = { activeTab: 'pending', requests: [], viewers: [], accounts: [], loading: true, actionLoading: null };
  var PENDING_POLL_MS = ${PENDING_POLL_MS};
  var pendingInFlight = false;
  var pendingQueued = false;
  var pendingUpdatedAt = 0;
  function hidePanels() {
    document.getElementById('admin-requests-wrap').style.display = 'none';
    document.getElementById('admin-viewers-wrap').style.display = 'none';
    document.getElementById('admin-accounts-wrap').style.display = 'none';
    document.getElementById('admin-chat-wrap').style.display = 'none';
  }
  function paintPendingAge() {
    var el = document.getElementById('admin-pending-age');
    if (!el) return;
    if (state.activeTab !== 'pending' || !pendingUpdatedAt) {
      el.style.display = 'none';
      return;
    }
    var secs = Math.max(0, Math.floor((Date.now() - pendingUpdatedAt) / 1000));
    el.textContent = 'Updated ' + secs + 's ago';
    el.style.display = 'block';
  }
  function markPendingUpdated() {
    pendingUpdatedAt = Date.now();
    paintPendingAge();
  }
  function preserveScroll(fn) {
    var y = window.scrollY || window.pageYOffset || 0;
    var list = document.getElementById('admin-requests-list');
    var top = list ? list.scrollTop : 0;
    fn();
    window.scrollTo(0, y);
    if (list) list.scrollTop = top;
  }
  function renderRequestCards(requests, emptyText) {
    var list = document.getElementById('admin-requests-list');
    var empty = document.getElementById('admin-requests-empty');
    if (!list || !empty) return;
    if (!requests.length) {
      list.innerHTML = '';
      empty.style.display = 'block';
      empty.textContent = emptyText;
      return;
    }
    empty.style.display = 'none';
    list.innerHTML = requests.map(function(req) {
      var actions = req.status === 'pending' ? '<div class="request-actions"><button type="button" class="btn btn-success admin-approve" data-id="' + esc(req.id) + '">Approve</button><button type="button" class="btn btn-danger admin-reject" data-id="' + esc(req.id) + '">Reject</button></div>' : '';
      var who = req.viewer && req.viewer.username ? req.viewer.username : 'Anonymous';
      var platform = req.viewer && req.viewer.platform ? ' · ' + req.viewer.platform : '';
      return '<div class="request-card"><div class="request-header"><span class="request-type">' + (req.type === 'song' ? '&#127925; Song' : '&#128172; Message') + '</span><span class="badge badge-' + esc(req.status) + '">' + esc(req.status) + '</span></div><div class="request-content"><p class="request-text">' + esc(req.content||'') + '</p>' + (req.artist ? '<p class="request-artist">by ' + esc(req.artist||'') + '</p>' : '') + '</div><div class="request-meta"><span>From: ' + esc(who) + esc(platform) + '</span><span>' + esc(formatDate(req.created_at)) + '</span></div>' + actions + '</div>';
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
  }
  function refreshPending() {
    if (state.activeTab !== 'pending') return;
    if (document.visibilityState === 'hidden') return;
    if (state.loading || state.actionLoading) return;
    if (pendingInFlight) { pendingQueued = true; return; }
    pendingInFlight = true;
    pendingQueued = false;
    fetch('/api/admin/requests?status=pending', { headers: getAdminHeaders() }).then(function(r) { return r.json(); }).then(function(data) {
      if (state.activeTab !== 'pending' || state.actionLoading) return;
      state.requests = data.requests || [];
      preserveScroll(function() {
        renderRequestCards(state.requests, 'No pending requests');
      });
      markPendingUpdated();
    }).catch(function() {}).finally(function() {
      pendingInFlight = false;
      if (pendingQueued) {
        pendingQueued = false;
        refreshPending();
      }
    });
  }
  function loadData() {
    state.loading = true;
    document.getElementById('admin-loading').style.display = 'block';
    hidePanels();
    if (state.activeTab === 'chat') {
      state.loading = false;
      document.getElementById('admin-loading').style.display = 'none';
      document.getElementById('admin-chat-wrap').style.display = 'block';
      return;
    }
    if (state.activeTab === 'viewers') {
      fetch('/api/admin/viewers', { headers: getAdminHeaders() }).then(function(r) { return r.json(); }).then(function(data) {
        state.viewers = data.viewers || [];
        state.loading = false;
        document.getElementById('admin-loading').style.display = 'none';
        document.getElementById('admin-viewers-wrap').style.display = 'block';
        var tbody = document.getElementById('admin-viewers-tbody');
        tbody.innerHTML = state.viewers.map(function(v) {
          return '<tr><td>' + esc(v.username || 'Anonymous') + '</td><td>' + formatTime(v.total_minutes || 0) + '</td><td><span class="badge ' + (v.is_regular ? 'badge-regular">Regular' : 'badge-pending">New') + '</span></td><td>' + esc(formatDate(v.created_at)) + '</td><td><button type="button" class="btn btn-sm ' + (v.is_regular ? 'btn-danger' : 'btn-success') + '" data-id="' + esc(v.id) + '">' + (v.is_regular ? 'Demote' : 'Promote') + '</button></td></tr>';
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
    } else if (state.activeTab === 'accounts') {
      fetch('/api/admin/accounts', { headers: getAdminHeaders() }).then(function(r) { return r.json(); }).then(function(data) {
        state.accounts = data.accounts || [];
        state.loading = false;
        document.getElementById('admin-loading').style.display = 'none';
        document.getElementById('admin-accounts-wrap').style.display = 'block';
        var tbody = document.getElementById('admin-accounts-tbody');
        tbody.innerHTML = state.accounts.map(function(a) {
          var status = a.banned ? '<span class="badge badge-rejected">Disabled</span>' : '<span class="badge badge-approved">Active</span>';
          var banLabel = a.banned ? 'Enable' : 'Disable';
          var banClass = a.banned ? 'btn-success' : 'btn-danger';
          return '<tr><td>' + esc(a.displayName || '') + '</td><td>' + esc(a.platform || '') + '</td><td>' + esc(a.email || '') + '</td><td>' + status + '</td><td>' + esc(formatDate(a.createdAt)) + '</td><td><button type="button" class="btn btn-sm ' + banClass + ' account-ban" data-id="' + esc(a.id) + '" data-banned="' + (a.banned ? '1' : '0') + '">' + banLabel + '</button> <button type="button" class="btn btn-sm btn-secondary account-delete" data-id="' + esc(a.id) + '">Delete</button></td></tr>';
        }).join('');
        tbody.querySelectorAll('.account-ban').forEach(function(btn) {
          btn.onclick = function() {
            var id = btn.getAttribute('data-id');
            if (state.actionLoading === id) return;
            state.actionLoading = id;
            btn.disabled = true;
            var path = btn.getAttribute('data-banned') === '1' ? '/unban' : '/ban';
            fetch('/api/admin/accounts/' + id + path, { method: 'POST', headers: getAdminHeaders() }).then(function() { loadData(); }).finally(function() { state.actionLoading = null; });
          };
        });
        tbody.querySelectorAll('.account-delete').forEach(function(btn) {
          btn.onclick = function() {
            var id = btn.getAttribute('data-id');
            if (state.actionLoading === id) return;
            if (!window.confirm('Delete this account? They will not be able to log in. Older requests keep their display name.')) return;
            state.actionLoading = id;
            btn.disabled = true;
            fetch('/api/admin/accounts/' + id, { method: 'DELETE', headers: getAdminHeaders() }).then(function() { loadData(); }).finally(function() { state.actionLoading = null; });
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
        renderRequestCards(state.requests, 'No ' + state.activeTab + ' requests');
        if (state.activeTab === 'pending') markPendingUpdated();
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
    if (state.activeTab === 'pending') refreshPending();
    else if (state.activeTab !== 'viewers' && state.activeTab !== 'accounts' && state.activeTab !== 'chat') loadData();
  });
  setInterval(function() {
    if (document.visibilityState === 'hidden') return;
    refreshPending();
  }, PENDING_POLL_MS);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') refreshPending();
  });
  setInterval(paintPendingAge, 1000);
  document.getElementById('admin-clear-overlay').onclick = function() {
    fetch('/api/admin/overlay/clear', { method: 'POST', headers: getAdminHeaders() });
  };
  document.getElementById('admin-logout').onclick = function() {
    sessionStorage.removeItem('adminPassword');
    window.location.href = '/?admin=true';
  };
  loadData();
})();` + liveChatScript({
  passwordHeader: "x-admin-password",
  storageKey: "adminPassword",
  statusId: "admin-chat-status-text",
  dotId: "admin-chat-dot",
  listId: "admin-chat-list",
  emptyId: "admin-chat-empty",
  ageId: "admin-chat-age",
});

function jsString(value: string): string {
  return JSON.stringify(value);
}

export function liveChatScript(opts: {
  passwordHeader: "x-viewer-password" | "x-admin-password";
  storageKey: "viewerPassword" | "adminPassword";
  statusId: string;
  dotId: string;
  listId: string;
  emptyId: string;
  ageId: string;
}): string {
  const passwordHeader = opts.passwordHeader === "x-admin-password" ? "x-admin-password" : "x-viewer-password";
  const storageKey = opts.storageKey === "adminPassword" ? "adminPassword" : "viewerPassword";
  const safeId = (value: string) => (/^[A-Za-z0-9_-]+$/.test(value) ? value : "chat");
  return `
(function(){
  if (${jsString(storageKey)} === 'adminPassword' && !sessionStorage.getItem(${jsString(storageKey)})) return;
  var statusEl = document.getElementById(${jsString(safeId(opts.statusId))});
  var dotEl = document.getElementById(${jsString(safeId(opts.dotId))});
  var listEl = document.getElementById(${jsString(safeId(opts.listId))});
  var emptyEl = document.getElementById(${jsString(safeId(opts.emptyId))});
  if (!statusEl || !listEl || !emptyEl) return;
  var ageEl = document.getElementById(${jsString(safeId(opts.ageId))});
  var CHAT_POLL_MS = ${CHAT_POLL_MS};
  var seen = Object.create(null);
  var chatPollInFlight = false;
  var chatPollQueued = false;
  var chatUpdatedAt = 0;
  function paintChatAge() {
    if (!ageEl) return;
    if (!chatUpdatedAt) { ageEl.style.display = 'none'; return; }
    var secs = Math.max(0, Math.floor((Date.now() - chatUpdatedAt) / 1000));
    ageEl.textContent = 'Updated ' + secs + 's ago';
    ageEl.style.display = 'block';
  }
  function markChatUpdated() {
    chatUpdatedAt = Date.now();
    paintChatAge();
  }
  function setStatus(text, mode) {
    statusEl.textContent = text;
    if (dotEl) dotEl.className = 'chat-dot' + (mode === 'live' ? ' live' : mode === 'wait' ? ' wait' : '');
  }
  function render(msg) {
    if (!msg || typeof msg.id !== 'string' || seen[msg.id]) return;
    seen[msg.id] = true;
    var platform = typeof msg.platform === 'string' && /^[a-z0-9_-]{1,32}$/.test(msg.platform) ? msg.platform : 'chat';
    var label = platform === 'twitter' ? 'x' : platform;
    var avatar = msg.avatar
      ? '<img class="chat-avatar" alt="" referrerpolicy="no-referrer" src="' + esc(msg.avatar) + '"/>'
      : '<span class="chat-avatar chat-avatar-fallback">' + esc(label.slice(0, 1).toUpperCase()) + '</span>';
    var extra = msg.donation ? '<span class="chat-donation">' + esc(msg.donation) + '</span>' : '';
    var eventLabel = msg.event ? '<span class="chat-event">' + esc(msg.event) + '</span>' : '';
    var row = document.createElement('div');
    row.className = 'chat-item';
    row.innerHTML = avatar + '<div class="chat-body"><div class="chat-meta"><span class="chat-platform platform-' + platform + '">' + esc(label) + '</span><span class="chat-name">' + esc(msg.author || 'Someone') + '</span>' + extra + eventLabel + '</div><div class="chat-text">' + esc(msg.message || '') + '</div></div>';
    var img = row.querySelector('img');
    if (img) img.onerror = function() { img.style.display = 'none'; };
    var stick = listEl.children.length === 0 || (listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight) < 48;
    listEl.appendChild(row);
    while (listEl.children.length > 100) {
      var first = listEl.firstChild;
      if (first) listEl.removeChild(first);
    }
    emptyEl.style.display = 'none';
    listEl.style.display = 'flex';
    if (stick) listEl.scrollTop = listEl.scrollHeight;
  }
  function applyStatus(status) {
    if (!status) { setStatus('Waiting for chat', 'wait'); return; }
    if (status.state === 'unconfigured') setStatus('Chat is not configured on the server', '');
    else if (status.state === 'invalid-config') setStatus('Chat configuration needs a valid session id', '');
    else if (status.connected) setStatus('Live', 'live');
    else setStatus('Waiting for Social Stream', 'wait');
  }
  function authHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    var secret = sessionStorage.getItem(${jsString(storageKey)});
    if (secret) headers[${jsString(passwordHeader)}] = secret;
    return headers;
  }
  setStatus('Connecting', 'wait');
  fetch('/api/chat/ticket', { method: 'POST', headers: authHeaders() }).then(function(r) {
    if (!r.ok) throw new Error('auth');
    return r.json();
  }).then(function(ticket) {
    return fetch('/api/chat/recent', { headers: authHeaders() }).then(function(r) {
      if (!r.ok) throw new Error('recent');
      return r.json();
    }).then(function(recent) { return { ticket: ticket, recent: recent }; });
  }).then(function(bundle) {
    var es = new EventSource('/api/chat/stream?ticket=' + encodeURIComponent(bundle.ticket.ticket));
    es.addEventListener('status', function(e) {
      try { applyStatus(JSON.parse(e.data)); } catch (err) {}
    });
    es.addEventListener('chat', function(e) {
      try { render(JSON.parse(e.data)); } catch (err) {}
      setStatus('Live', 'live');
      markChatUpdated();
    });
    es.onerror = function() { setStatus('Reconnecting', 'wait'); };
    applyStatus(bundle.recent.status);
    (bundle.recent.messages || []).forEach(render);
    markChatUpdated();
    function pollRecent() {
      if (document.visibilityState === 'hidden') return;
      if (chatPollInFlight) { chatPollQueued = true; return; }
      chatPollInFlight = true;
      chatPollQueued = false;
      fetch('/api/chat/recent', { headers: authHeaders() }).then(function(r) {
        if (!r.ok) throw new Error('recent');
        return r.json();
      }).then(function(recent) {
        (recent.messages || []).forEach(render);
        if (recent.status) applyStatus(recent.status);
        markChatUpdated();
      }).catch(function() {}).finally(function() {
        chatPollInFlight = false;
        if (chatPollQueued && document.visibilityState !== 'hidden') {
          chatPollQueued = false;
          pollRecent();
        }
      });
    }
    setInterval(function() {
      if (document.visibilityState === 'hidden') return;
      pollRecent();
    }, CHAT_POLL_MS);
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') pollRecent();
    });
    setInterval(paintChatAge, 1000);
  }).catch(function() {
    setStatus('Could not open live chat', '');
  });
})();`;
}

export const OVERLAY_BODY = `
<style>
  body{background:transparent!important;background-image:none!important;margin:0}
  .overlay-root{padding:.2rem .4rem}
  .overlay-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Rajdhani',sans-serif;font-size:1.7rem;font-weight:700;line-height:1.25;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.9)}
</style>
<div class="overlay-root" id="overlay-root"></div>`;

export const OVERLAY_SCRIPT = `
(function(){
  var OVERLAY_REFRESH_MS = ${OVERLAY_REFRESH_MS};
  var root = document.getElementById('overlay-root');
  var inFlight = false;
  var queued = false;
  function render(text) {
    var lines = String(text || '').split('\\n').map(function(line) { return line.trim(); }).filter(Boolean);
    root.textContent = '';
    lines.forEach(function(line) {
      var div = document.createElement('div');
      div.className = 'overlay-line';
      div.textContent = line;
      root.appendChild(div);
    });
  }
  function refresh() {
    if (document.visibilityState === 'hidden') return;
    if (inFlight) { queued = true; return; }
    inFlight = true;
    queued = false;
    fetch('/api/overlay/current', { cache: 'no-store' }).then(function(r) { return r.text(); }).then(render).catch(function() {}).finally(function() {
      inFlight = false;
      if (queued && document.visibilityState !== 'hidden') refresh();
    });
  }
  refresh();
  setInterval(function() {
    if (document.visibilityState === 'hidden') return;
    refresh();
  }, OVERLAY_REFRESH_MS);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') refresh();
  });
  var es = new EventSource('/api/events');
  es.addEventListener('request', function(e) {
    try {
      var req = JSON.parse(e.data);
      if (req && req.type === 'song') refresh();
    } catch (err) { refresh(); }
  });
})();`;
