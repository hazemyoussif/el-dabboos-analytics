import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { ApiError } from '../errors.ts';
/** Domain-separated encryption key derived from the protected application secret. */
export class WorkspaceAiKeyCipher {
  constructor(private readonly secret?: string) {}
  get available() { return Boolean(this.secret && this.secret.length >= 32); }
  private key() {
    if (!this.available) throw new ApiError(503, 'AI_KEY_STORAGE_UNAVAILABLE', 'Configure a protected application secret before saving an API key.');
    return createHash('sha256').update('el-dabboos:workspace-ai-key:v1:').update(this.secret!).digest();
  }
  encrypt(tenantId: string, apiKey: string): string {
    if (!apiKey || apiKey.length > 6000 || /\s/.test(apiKey)) throw new ApiError(400, 'INVALID_AI_KEY', 'Enter a valid API key.');
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), nonce);
    cipher.setAAD(Buffer.from(tenantId));
    const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
    return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  }
  decrypt(tenantId: string, encoded: string): string {
    try {
      const [version, nonce, tag, ciphertext, extra] = encoded.split('.');
      if (version !== 'v1' || !nonce || !tag || !ciphertext || extra) throw new Error('Invalid key');
      const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(nonce, 'base64url'));
      decipher.setAAD(Buffer.from(tenantId)); decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
    } catch { throw new ApiError(503, 'AI_KEY_UNAVAILABLE', 'The saved API key is unavailable. Ask a workspace administrator to replace it.'); }
  }
}
