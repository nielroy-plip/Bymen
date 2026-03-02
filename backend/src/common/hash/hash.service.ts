import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class HashService {
  sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
