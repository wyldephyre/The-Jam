# The Jam - Development Log

## 2024-12-18 | Initial Build

### What We Built
**WyldePhyre Viewer Hub** — A centralized, multi-platform interaction site for live streams (Twitch/Rumble/X).

### Tech Stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Express (Vercel deployable)
- **Database:** Supabase (PostgreSQL + Realtime)
- **Spotify:** spotify-web-api-node

### Features Implemented

#### Viewer System
- Password-gated entry (env var controlled)
- UUID-based viewer identification (localStorage)
- Optional username prompt on first visit
- Active time tracking via Page Visibility API
- 60-second heartbeat to `/api/time/log`
- Auto-promote to "Regular" at 300 hours (configurable)

#### Song Requests
- Spotify search integration (server-side)
- Song request submission with track selection
- Auto-approve for Regulars → immediate queue add
- Pending status for non-Regulars

#### Messages
- Text message submission
- Pending approval workflow

#### Admin Dashboard
- Separate admin password gate
- View/filter requests by status (pending/approved/rejected/all)
- Approve → adds song to Spotify queue
- Reject → marks as rejected
- Viewers list with manual Regular toggle

#### Real-time
- Supabase Realtime subscriptions on both tables
- Live feed of approved requests on Hub
- Live updates on Admin dashboard

#### OBS Integration
- `backend/overlay/now-playing.txt` — updated on song approval
- Format: `Requested by [username]: [Song Name] - [Artist]`
- `GET /api/overlay/current` — plain text endpoint for browser source
- Admin "Clear Overlay" button

### Files Created
```
The Jam/
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── middleware/auth.js
│   │   ├── routes/auth.js
│   │   ├── routes/time.js
│   │   ├── routes/requests.js
│   │   ├── routes/admin.js
│   │   ├── routes/overlay.js
│   │   ├── services/supabase.js
│   │   └── services/spotify.js
│   ├── overlay/.gitkeep
│   ├── package.json
│   └── vercel.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── pages/Gate.jsx + Gate.css
│   │   ├── pages/Hub.jsx + Hub.css
│   │   ├── pages/Admin.jsx + Admin.css
│   │   ├── hooks/useVisibility.js
│   │   ├── hooks/useSupabaseRealtime.js
│   │   ├── services/api.js
│   │   └── services/supabase.js
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── env.example
├── supabase/schema.sql
├── env.example
├── README.md
├── .gitignore
└── DEVLOG.md
```

### Git
- Repo: https://github.com/wyldephyre/The-Jam
- Initial commit pushed

### Next Steps
1. Set up Supabase project and run schema.sql
2. Configure Spotify Developer app + get refresh token
3. Create `.env` files from examples
4. `npm install` in both frontend/ and backend/
5. Test locally with `npm run dev`
6. Deploy to Vercel

### Notes
- Regular threshold default: 18,000 minutes (300 hours)
- UI uses Orbitron + Rajdhani fonts with fire/cyber aesthetic
- Dark theme with orange (#ff4d00) and cyan (#00d4ff) accents

