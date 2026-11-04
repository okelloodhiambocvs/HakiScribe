import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { initDatabase } from './server/db/database';
import { apiRouter } from './server/routes/apiRouter';
import { RealtimeTranscribeBridge } from './server/integrations/meta/realtimeTranscribe';

dotenv.config();

// Initialize persistent SQLite tables and schema
initDatabase();

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve demo audio and static assets
app.use('/demo-data', express.static(path.resolve(process.cwd(), 'demo-data')));
app.use('/evaluation', express.static(path.resolve(process.cwd(), 'evaluation')));
const exportsDir = path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), 'storage'), 'exports');
app.use('/storage/exports', express.static(exportsDir));

// Mount versioned API
app.use('/api/v1', apiRouter);

// WebSocket server for real-time live microphone transcription
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  if (pathname === '/api/v1/audio/live-stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws: WebSocket) => {
  const bridge = new RealtimeTranscribeBridge(ws);
  bridge.initSession();

  ws.on('message', (data: Buffer | ArrayBuffer) => {
    bridge.handleAudioChunk(data);
  });

  ws.on('close', () => {
    bridge.close();
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: HOST, port: PORT, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`[HakiScribe-AI] Server listening on http://${HOST}:${PORT}`);
    console.log(`[HakiScribe-AI] API v1 mounted at http://${HOST}:${PORT}/api/v1`);
  });
}

startServer().catch((err) => {
  console.error('[HakiScribe-AI] Fatal server startup error:', err);
  process.exit(1);
});
