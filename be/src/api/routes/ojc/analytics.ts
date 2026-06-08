import { Router } from "express";
import { Container } from "typedi";
import OjcAnalyticsController from "../../../controllers/ojc/OjcAnalyticsController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/analytics", route);
  const controller = Container.get("ojcAnalyticsController") as OjcAnalyticsController;
  route.get("", requirePermission("export", "view_campaigns", "view_users"), (req, res) => controller.get(req, res));
};
