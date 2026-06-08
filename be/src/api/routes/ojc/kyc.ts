import { Router } from "express";
import { Container } from "typedi";
import OjcKycController from "../../../controllers/ojc/OjcKycController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/kyc", route);

  const controller = Container.get("ojcKycController") as OjcKycController;

  route.get("", requirePermission("view_kyc"), (req, res) => controller.list(req, res));
  route.post("/:verificationId/mismatch-warning", requirePermission("view_kyc"), (req, res) => controller.sendMismatchWarning(req, res));
  route.post("/:verificationId/reset-stale", requirePermission("view_kyc"), (req, res) => controller.resetStaleSubmission(req, res));
  route.post("/:verificationId/deactivate", requirePermission("view_kyc"), (req, res) => controller.deactivateAccount(req, res));
  route.post("/:verificationId/activate", requirePermission("view_kyc"), (req, res) => controller.activateAccount(req, res));
};
