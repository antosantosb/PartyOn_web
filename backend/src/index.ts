import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Basic health route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: 'connected' });
});

import apiRouter from './routes/api.route';

// API Routes
app.use('/api', apiRouter);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
