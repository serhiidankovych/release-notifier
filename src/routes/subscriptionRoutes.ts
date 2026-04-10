import { Router } from "express";
import { SubscriptionController } from "../controllers/SubscriptionController.js";

const router = Router();
const controller = new SubscriptionController();

router.post("/subscribe", (req, res) => controller.subscribe(req, res));
router.get("/confirm/:token", (req, res) => controller.confirm(req, res));
router.get("/unsubscribe/:token", (req, res) =>
  controller.unsubscribe(req, res),
);
router.get("/subscriptions", (req, res) =>
  controller.getSubscriptions(req, res),
);

export default router;
