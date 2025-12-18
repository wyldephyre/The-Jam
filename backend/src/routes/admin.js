import express from 'express';
import { supabase } from '../services/supabase.js';
import { addToQueue } from '../services/spotify.js';
import { adminAuth } from '../middleware/auth.js';
import { writeOverlayFile, clearOverlayFile } from './overlay.js';

const router = express.Router();

router.get('/requests', adminAuth, async (req, res) => {
  const { status } = req.query;
  
  try {
    let query = supabase
      .from('requests')
      .select(`
        *,
        viewer:viewers(username, total_minutes, is_regular)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ requests: data });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

router.post('/requests/:id/approve', adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Get request with viewer info
    const { data: request, error: fetchError } = await supabase
      .from('requests')
      .select(`
        *,
        viewer:viewers(username)
      `)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Update status
    const { error: updateError } = await supabase
      .from('requests')
      .update({ status: 'approved' })
      .eq('id', id);

    if (updateError) throw updateError;

    // Add to Spotify queue if song
    if (request.type === 'song' && request.spotify_uri) {
      try {
        await addToQueue(request.spotify_uri);
        const username = request.viewer?.username || 'Anonymous';
        await writeOverlayFile(username, request.content, request.artist);
      } catch (spotifyError) {
        console.error('Failed to add to Spotify queue:', spotifyError);
      }
    }

    res.json({ success: true, request: { ...request, status: 'approved' } });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

router.post('/requests/:id/reject', adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('requests')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

router.get('/viewers', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('viewers')
      .select('*')
      .order('total_minutes', { ascending: false });

    if (error) throw error;
    res.json({ viewers: data });
  } catch (error) {
    console.error('Error fetching viewers:', error);
    res.status(500).json({ error: 'Failed to fetch viewers' });
  }
});

router.post('/viewers/:id/toggle-regular', adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: viewer, error: fetchError } = await supabase
      .from('viewers')
      .select('is_regular')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('viewers')
      .update({ is_regular: !viewer.is_regular })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ viewer: data });
  } catch (error) {
    console.error('Error toggling regular status:', error);
    res.status(500).json({ error: 'Failed to toggle regular status' });
  }
});

router.post('/overlay/clear', adminAuth, async (req, res) => {
  try {
    await clearOverlayFile();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing overlay:', error);
    res.status(500).json({ error: 'Failed to clear overlay' });
  }
});

export default router;

