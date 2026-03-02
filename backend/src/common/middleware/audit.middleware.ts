import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private db: DatabaseService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    res.on('finish', async () => {
      if ((req as any).user) {
        await this.db.createAuditLog({
          action: req.method + ' ' + req.originalUrl,
          userId: (req as any).user.id,
          ip: req.ip,
          details: JSON.stringify({
            body: req.body,
            params: req.params,
            query: req.query,
            status: res.statusCode,
          }),
        });
      }
    });
    next();
  }
}
