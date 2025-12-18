import express from 'express';
import { supabase } from '../services/supabase.js';
import { viewerAuth } from '../middleware/auth.js';

const router = express.Router();

const REGULAR_THRESHOLD = parseInt(process.env.REGULAR_THRESHOLD_MINUTES || '18000', 10);

router.post('/log', viewerAuth, async (req, res) => {
  const { viewerId } = req.body;
  
  if (!viewerId) {
    return res.status(400).json({ error: 'viewerId required' });
  }

  try {
    // Get current viewer
    const { data: viewer, error: fetchError } = await supabase
      .from('viewers')
      .select('*')
      .eq('id', viewerId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (!viewer) {
      // Create new viewer
      const { data: newViewer, error: insertError } = await supabase
        .from('viewers')
        .insert({ id: viewerId, total_minutes: 1 })
        .select()
        .single();
      
      if (insertError) throw insertError;
      return res.json({ viewer: newViewer, isRegular: false });
    }

    // Update existing viewer
    const newMinutes = viewer.total_minutes + 1;
    const shouldBeRegular = newMinutes >= REGULAR_THRESHOLD;
    
    const { data: updatedViewer, error: updateError } = await supabase
      .from('viewers')
      .update({ 
        total_minutes: newMinutes,
        is_regular: viewer.is_regular || shouldBeRegular,
        updated_at: new Date().toISOString()
      })
      .eq('id', viewerId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    res.json({ 
      viewer: updatedViewer, 
      isRegular: updatedViewer.is_regular,
      promoted: !viewer.is_regular && shouldBeRegular
    });
  } catch (error) {
    console.error('Error logging time:', error);
    res.status(500).json({ error: 'Failed to log time' });
  }
});

router.post('/set-username', viewerAuth, async (req, res) => {
  const { viewerId, username } = req.body;
  
  if (!viewerId || !username) {
    return res.status(400).json({ error: 'viewerId and username required' });
  }

  try {
    const { data, error } = await supabase
      .from('viewers')
      .update({ username, updated_at: new Date().toISOString() })
      .eq('id', viewerId)
      .select()
      .single();

    if (error) throw error;
    res.json({ viewer: data });
  } catch (error) {
    console.error('Error setting username:', error);
    res.status(500).json({ error: 'Failed to set username' });
  }
});

router.get('/viewer/:id', viewerAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('viewers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ viewer: data || null });
  } catch (error) {
    console.error('Error fetching viewer:', error);
    res.status(500).json({ error: 'Failed to fetch viewer' });
  }
});

export default router;

