import express from 'express';
import cors from 'cors';
import path from 'path';
import 'dotenv/config';
import routes from './routes';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

// Serve uploaded files (static, but downloads go through authenticated endpoint)
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
