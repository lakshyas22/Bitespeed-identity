import { Router, Request, Response, NextFunction } from "express";
import { identifyContact } from "../services/identityService";
import { validateIdentifyRequest } from "../middleware/validateRequest";
import { IdentifyRequest } from "../types";

export const identifyRouter = Router();

identifyRouter.post(
  "/identify",
  validateIdentifyRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as IdentifyRequest;

      const normalizedPhoneNumber =
        body.phoneNumber !== undefined && body.phoneNumber !== null
          ? String(body.phoneNumber)
          : undefined;

      const result = await identifyContact({
        email: body.email || undefined,
        phoneNumber: normalizedPhoneNumber,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);
