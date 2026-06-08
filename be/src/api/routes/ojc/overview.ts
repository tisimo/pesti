import { Router } from "express";
import { Container } from "typedi";
import OjcOverviewController from "../../../controllers/ojc/OjcOverviewController";
import { requireApplicationAccess } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/overview", route);

  const controller = Container.get("ojcOverviewController") as OjcOverviewController;

  route.get("/stats", requireApplicationAccess("just_causes"), (req, res) => controller.getStats(req, res));
};
