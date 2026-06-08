import { Router } from "express";
import { Container } from "typedi";
import OjcDepositsController from "../../../controllers/ojc/OjcDepositsController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/deposits", route);

  const controller = Container.get("ojcDepositsController") as OjcDepositsController;

  route.get("", requirePermission("view_deposits"), (req, res) => controller.list(req, res));
};
