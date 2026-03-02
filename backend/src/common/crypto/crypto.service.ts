import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CryptoService {
  private readonly key = Buffer.from(process.env.AES_KEY || '', 'utf-8');

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
  }

  decrypt(data: string): string {
    const [iv, encrypted] = data.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, Buffer.from(iv, 'base64'));
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
