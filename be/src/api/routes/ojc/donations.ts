import { Router } from "express";
import { Container } from "typedi";
import OjcDonationsController from "../../../controllers/ojc/OjcDonationsController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/donations", route);
  const controller = Container.get("ojcDonationsController") as OjcDonationsController;
  route.get("", requirePermission("view_donations"), (req, res) => controller.list(req, res));
};
