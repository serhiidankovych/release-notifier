import { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { SubscriptionService } from "../services/subscriptionService.js";
import {
  subscribeRequestSchema,
  tokenParamSchema,
  emailQuerySchema,
} from "../validators/subscriptionSchemas.js";
import { z } from "zod";

export class SubscriptionController extends BaseController {
  private subscriptionService: SubscriptionService;

  constructor() {
    super();
    this.subscriptionService = new SubscriptionService();
  }

  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const validated = subscribeRequestSchema.parse(req.body);
      await this.withTransaction("subscription.subscribe", "http.handler", () =>
        this.subscriptionService.subscribe(validated),
      );
      this.handleSuccess(
        res,
        undefined,
        "Subscription successful. Confirmation email sent.",
      );
    } catch (error) {
      if (error instanceof z.ZodError)
        return this.handleError(error, res, "subscribe", 400);
      this.handleError(error, res, "subscribe");
    }
  }

  async confirm(req: Request, res: Response): Promise<void> {
    try {
      const { token } = tokenParamSchema.parse(req.params);
      await this.subscriptionService.confirm(token);
      this.handleSuccess(res, undefined, "Subscription confirmed successfully");
    } catch (error) {
      if (error instanceof z.ZodError)
        return this.handleError(error, res, "confirm", 400);
      this.handleError(error, res, "confirm");
    }
  }

  async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const { token } = tokenParamSchema.parse(req.params);
      await this.subscriptionService.unsubscribe(token);
      this.handleSuccess(res, undefined, "Unsubscribed successfully");
    } catch (error) {
      if (error instanceof z.ZodError)
        return this.handleError(error, res, "unsubscribe", 400);
      this.handleError(error, res, "unsubscribe");
    }
  }

  async getSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const { email } = emailQuerySchema.parse(req.query);
      const subscriptions =
        await this.subscriptionService.getSubscriptions(email);
      res.status(200).json(subscriptions);
    } catch (error) {
      if (error instanceof z.ZodError)
        return this.handleError(error, res, "getSubscriptions", 400);
      this.handleError(error, res, "getSubscriptions");
    }
  }
}
