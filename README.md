# WyldePhyre Viewer Hub

A centralized, multi-platform interaction site for live streams (Twitch/Rumble/X). Viewers access via one shared link posted in chats to request Spotify songs, send messages, and earn loyalty time.

## Features

- **Password-gated access** for viewers and separate admin dashboard
- **Viewer loyalty tracking** via active time on site (Page Visibility API)
- **Auto-promote to "Regular"** after configurable threshold (default: 300 hours)
- **Spotify song requests** with search and queue integration
- **Moderated messages** with approval workflow
- **Real-time feed** of approved requests via Supabase Realtime
- **OBS overlay output** for displaying current song requests on stream

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express (Vercel deployable)
- **Database:** Supabase (PostgreSQL + Realtime)
- **Spotify:** spotify-web-api-node

## Setup

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Get your project URL, anon key, and service key from Settings > API

### 2. Spotify Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3001/callback` to Redirect URIs
4. Note your Client ID and Client Secret
5. Get a refresh token:
   - Use the [Spotify Authorization Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow) with scopes: `user-modify-playback-state user-read-playback-state`
   - Or use a tool like [spotify-token-swap](https://github.com/bih/spotify-token-swap)

### 3. Environment Variables

**Backend:** Copy `.env.example` to `backend/.env` and fill in values:

```bash
cd backend
cp ../.env.example .env
# Edit .env with your values
```

**Frontend:** Copy `frontend/.env.example` to `frontend/.env`:

```bash
cd frontend
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

### 4. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Run Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173` for the viewer hub.

## Usage

### Viewer Flow

1. Share the link in your stream chats
2. Viewers enter the password to access
3. Optional: Set a display name
4. Search and request songs or send messages
5. Regulars (300+ hours) get auto-approved song requests

### Admin Dashboard

1. Visit `/?admin=true` or click "Admin Login" on gate
2. Enter admin password
3. Approve/reject pending requests
4. Manage viewers (promote/demote regulars)
5. Clear OBS overlay when needed

### OBS Overlay Setup

**Option 1: Text File (Local)**
1. Add a "Text (GDI+)" source in OBS
2. Check "Read from file"
3. Browse to `backend/overlay/now-playing.txt`

**Option 2: Browser Source (Remote)**
1. Add a "Browser" source in OBS
2. Set URL to `http://your-server/api/overlay/current`
3. Refresh periodically or use custom CSS for styling

## Deployment (Vercel)

### Backend

```bash
cd backend
vercel
```

Set environment variables in Vercel dashboard.

### Frontend

```bash
cd frontend
npm run build
vercel
```

Update the API proxy in production or set `VITE_API_URL` environment variable.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VIEWER_PASSWORD` | Password for viewer access | Required |
| `ADMIN_PASSWORD` | Password for admin dashboard | Required |
| `REGULAR_THRESHOLD_MINUTES` | Minutes to become a Regular | 18000 (300 hours) |
| `OVERLAY_FILE_PATH` | Path to OBS overlay text file | `./overlay/now-playing.txt` |

## License

MIT

