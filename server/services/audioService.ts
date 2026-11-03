import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ALLOWED_AUDIO_EXTENSIONS, MAX_AUDIO_BYTES } from '../../shared/taxonomy';

export interface ValidatedAudio {
  filename: string;
  storedPath: string;
  sizeBytes: number;
  sha256: string;
  mimetype: string;
}

export class AudioService {
  private static uploadDir = path.resolve(process.cwd(), 'storage/uploads');

  public static ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public static validateAudioFile(file: Express.Multer.File): ValidatedAudio {
    this.ensureUploadDir();

    if (!file || !file.buffer) {
      throw new Error('No audio file uploaded or file is empty.');
    }

    if (file.size > MAX_AUDIO_BYTES) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 25MB.`);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
      throw new Error(`Unsupported audio format '${ext}'. Supported formats: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`);
    }

    // Compute SHA-256 fingerprint
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Safe filename
    const safeName = `${Date.now()}_${path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const targetPath = path.join(this.uploadDir, safeName);

    fs.writeFileSync(targetPath, file.buffer);

    return {
      filename: file.originalname,
      storedPath: targetPath,
      sizeBytes: file.size,
      sha256: hash,
      mimetype: file.mimetype || 'audio/wav',
    };
  }

  public static getDemoAudioPath(): string {
    const demoPath = path.resolve(process.cwd(), 'public/demo-data/synthetic/case-cr-123-2026.wav');
    if (!fs.existsSync(demoPath)) {
      const altPath = path.resolve(process.cwd(), 'demo-data/synthetic/case-cr-123-2026.wav');
      if (fs.existsSync(altPath)) return altPath;
    }
    return demoPath;
  }
}
