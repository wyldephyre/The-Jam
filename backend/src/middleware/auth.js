export function viewerAuth(req, res, next) {
  const password = req.headers['x-viewer-password'];
  if (password !== process.env.VIEWER_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  next();
}

export function adminAuth(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  next();
}

