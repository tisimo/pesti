import { Router } from "express";
import { Container } from "typedi";
import OjcAdminUsersController from "../../../controllers/ojc/OjcAdminUsersController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/admins", route);
  const controller = Container.get("ojcAdminUsersController") as OjcAdminUsersController;
  route.get("", requirePermission("manage_admins"), (req, res) => controller.list(req, res));
};
