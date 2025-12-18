import express from 'express';

const router = express.Router();

router.post('/verify', (req, res) => {
  const { password, type } = req.body;
  
  if (type === 'viewer') {
    if (password === process.env.VIEWER_PASSWORD) {
      return res.json({ valid: true });
    }
  } else if (type === 'admin') {
    if (password === process.env.ADMIN_PASSWORD) {
      return res.json({ valid: true });
    }
  }
  
  res.status(401).json({ valid: false, error: 'Invalid password' });
});

export default router;

