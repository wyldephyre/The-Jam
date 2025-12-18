import express from 'express';
import { supabase } from '../services/supabase.js';
import { searchTracks, addToQueue } from '../services/spotify.js';
import { viewerAuth } from '../middleware/auth.js';
import { writeOverlayFile } from './overlay.js';

const router = express.Router();

router.get('/search', viewerAuth, async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query required' });
  }

  try {
    const tracks = await searchTracks(q);
    res.json({ tracks });
  } catch (error) {
    console.error('Spotify search error:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

router.post('/submit', viewerAuth, async (req, res) => {
  const { viewerId, type, content, spotifyUri, artist } = req.body;

  if (!viewerId || !type || !content) {
    return res.status(400).json({ error: 'viewerId, type, and content required' });
  }

  try {
    // Get viewer to check if regular
    const { data: viewer } = await supabase
      .from('viewers')
      .select('*')
      .eq('id', viewerId)
      .single();

    const isRegular = viewer?.is_regular || false;
    const status = isRegular && type === 'song' ? 'approved' : 'pending';

    // Create request
    const { data: request, error } = await supabase
      .from('requests')
      .insert({
        viewer_id: viewerId,
        type,
        content,
        spotify_uri: spotifyUri || null,
        artist: artist || null,
        status
      })
      .select(`
        *,
        viewer:viewers(username)
      `)
      .single();

    if (error) throw error;

    // If auto-approved song, add to Spotify queue and update overlay
    if (status === 'approved' && type === 'song' && spotifyUri) {
      try {
        await addToQueue(spotifyUri);
        const username = viewer?.username || 'Anonymous';
        await writeOverlayFile(username, content, artist);
      } catch (spotifyError) {
        console.error('Failed to add to Spotify queue:', spotifyError);
      }
    }

    res.json({ 
      request, 
      autoApproved: status === 'approved',
      message: status === 'approved' 
        ? 'Your song has been added to the queue!' 
        : 'Your request is pending approval.'
    });
  } catch (error) {
    console.error('Error submitting request:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

router.get('/approved', viewerAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        viewer:viewers(username)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ requests: data });
  } catch (error) {
    console.error('Error fetching approved requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

export default router;

