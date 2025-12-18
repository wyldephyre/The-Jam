import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OVERLAY_PATH = process.env.OVERLAY_FILE_PATH || path.join(__dirname, '../../overlay/now-playing.txt');

const router = express.Router();

export async function writeOverlayFile(username, songName, artist) {
  const dir = path.dirname(OVERLAY_PATH);
  await fs.mkdir(dir, { recursive: true });
  const content = `Requested by ${username}: ${songName}${artist ? ` - ${artist}` : ''}`;
  await fs.writeFile(OVERLAY_PATH, content, 'utf-8');
}

export async function clearOverlayFile() {
  const dir = path.dirname(OVERLAY_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OVERLAY_PATH, '', 'utf-8');
}

router.get('/current', async (req, res) => {
  try {
    const content = await fs.readFile(OVERLAY_PATH, 'utf-8');
    res.type('text/plain').send(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.type('text/plain').send('');
    } else {
      console.error('Error reading overlay file:', error);
      res.status(500).send('Error reading overlay');
    }
  }
});

export default router;

