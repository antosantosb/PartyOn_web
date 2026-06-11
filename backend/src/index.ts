import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

dotenv.config();

export const prisma = new PrismaClient();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// CORS — restrict to the frontend origin in production via env var
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // In development (no FRONTEND_URL), we can be more permissive
    if (!origin || !process.env.FRONTEND_URL || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true
}));

// Webhook route MUST be raw for Stripe signature verification
import webhookRouter from './routes/webhook.route';
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRouter);

app.use(express.json({ limit: '10mb' }));

// Serve uploaded images as static files at /uploads
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer — store files in /app/uploads/ inside the container
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `bg_${Date.now()}${ext}`;
    cb(null, name);
  }
});
export const upload = multer({

  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// Root route
app.get('/', (_req, res) => {
  res.send('<h1>PartyOn Backend is Live</h1><p>API endpoints are available at /api</p>');
});

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});


import apiRouter from './routes/api.route';
app.use('/api', apiRouter);

// Ensure uploads dir exists before starting
import fs from 'fs';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`Server running on ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
});
