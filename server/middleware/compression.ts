import { Request, Response, NextFunction } from 'express';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

interface ExtendedResponse extends Response {
  json: (body: any) => Response;
}

// Simple compression middleware for large responses
export function compressionMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send.bind(res);
  
  res.send = function(body: any): Response {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Only compress if client accepts gzip and body is string/large enough
    if (acceptEncoding.includes('gzip') && typeof body === 'string' && body.length > 1024) {
      gzipAsync(body).then(compressed => {
        if (compressed.length < body.length) {
          res.setHeader('Content-Encoding', 'gzip');
          originalSend(compressed);
        } else {
          originalSend(body);
        }
      }).catch(() => {
        originalSend(body);
      });
    } else {
      originalSend(body);
    }
    
    return this;
  };
  
  next();
}