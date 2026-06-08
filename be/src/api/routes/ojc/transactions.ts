import { Router } from "express";
import { Container } from "typedi";
import OjcTransactionsController from "../../../controllers/ojc/OjcTransactionsController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/transactions", route);
  const controller = Container.get("ojcTransactionsController") as OjcTransactionsController;
  route.get("", requirePermission("view_donations"), (req, res) => controller.list(req, res));
};
