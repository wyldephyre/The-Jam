import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import timeRoutes from './routes/time.js';
import requestsRoutes from './routes/requests.js';
import adminRoutes from './routes/admin.js';
import overlayRoutes from './routes/overlay.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/time', timeRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/overlay', overlayRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

