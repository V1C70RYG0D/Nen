import { Request, Response, NextFunction } from 'express';
import express from 'express';

export const jsonParserWithErrorHandling = (req: Request, res: Response, next: NextFunction): void => {
  express.json()(req, res, (err: any) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON format',
        error: 'Malformed JSON in request body'
      });
      return;
    }
    next(err);
  });
};
