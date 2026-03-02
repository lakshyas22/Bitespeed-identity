import { Request, Response, NextFunction } from "express";

export function validateIdentifyRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { email, phoneNumber } = req.body;

  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).json({
      error: {
        message: "Request body is required",
        statusCode: 400,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (!email && !phoneNumber) {
    res.status(400).json({
      error: {
        message: "At least one of 'email' or 'phoneNumber' must be provided",
        statusCode: 400,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (email !== undefined) {
    if (typeof email !== "string" || email.trim() === "") {
      res.status(400).json({
        error: {
          message: "'email' must be a non-empty string",
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: {
          message: "'email' must be a valid email address",
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
  }

  if (phoneNumber !== undefined) {
    const phoneStr = String(phoneNumber).trim();
    if (phoneStr === "") {
      res.status(400).json({
        error: {
          message: "'phoneNumber' must not be empty",
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
  }

  next();
}
