import { Router } from "express";
import { Container } from "typedi";
import OjcUsersController from "../../../controllers/ojc/OjcUsersController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/users", route);

  const controller = Container.get("ojcUsersController") as OjcUsersController;

  route.get("", requirePermission("view_users", "flag_escalate", "block_suspend"), (req, res) => controller.list(req, res));
  route.get("/:profileId", requirePermission("view_users", "flag_escalate", "block_suspend"), (req, res) => controller.get(req, res));
  route.patch("/:profileId/status", requirePermission("block_suspend"), (req, res) => controller.updateStatus(req, res));
  route.patch("/:profileId/strikes", requirePermission("block_suspend"), (req, res) => controller.updateStrikes(req, res));
};
