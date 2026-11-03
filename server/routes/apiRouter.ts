import { Router, Request, Response } from 'express';
import { authRouter } from './authRoutes';
import { sessionRouter } from './sessionRoutes';
import { audioRouter } from './audioRoutes';
import { transcriptRouter } from './transcriptRoutes';
import { reviewRouter } from './reviewRoutes';
import { exportRouter } from './exportRoutes';
import { auditRouter } from './auditRoutes';

export const apiRouter = Router();

// Endpoint inventory registry
apiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'HakiScribe-AI API',
    version: 'v1',
    description: 'Consolidated API for human-in-the-loop court transcription',
    endpoints: {
      auth: ['POST /api/v1/auth/login', 'GET /api/v1/auth/me', 'GET /api/v1/auth/users'],
      sessions: [
        'POST /api/v1/sessions',
        'POST /api/v1/sessions/demo',
        'GET /api/v1/sessions',
        'GET /api/v1/sessions/:id',
        'DELETE /api/v1/sessions/:id',
      ],
      audio: [
        'POST /api/v1/audio/upload',
        'POST /api/v1/audio/:id/transcribe',
        'WS   /api/v1/audio/live-stream',
      ],
      transcripts: [
        'GET /api/v1/transcripts/:id',
        'GET /api/v1/transcripts/:id/segments',
        'PUT /api/v1/transcripts/segments/:segmentId',
        'GET /api/v1/transcripts/:id/history',
      ],
      review: [
        'POST /api/v1/review/:id/run',
        'GET  /api/v1/review/:id/flags',
        'POST /api/v1/review/flags/:flagId/decide',
        'POST /api/v1/review/:id/roles',
        'GET  /api/v1/review/:id/roles',
      ],
      export: [
        'POST /api/v1/export/:id/docx',
        'GET  /api/v1/export/:id/latest',
        'GET  /api/v1/export/download/:filename',
      ],
      audit: [
        'GET /api/v1/audit/events',
        'GET /api/v1/audit/ledger',
        'GET /api/v1/audit/health',
      ],
    },
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/sessions', sessionRouter);
apiRouter.use('/audio', audioRouter);
apiRouter.use('/transcripts', transcriptRouter);
apiRouter.use('/review', reviewRouter);
apiRouter.use('/export', exportRouter);
apiRouter.use('/audit', auditRouter);
