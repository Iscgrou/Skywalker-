import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction){
  const headerName = 'x-request-id';
  let id = req.headers[headerName] as string | undefined;
  if (!id || id.length < 8) id = randomUUID();
  (req as any).correlationId = id;
  res.setHeader(headerName, id);
  next();
}
