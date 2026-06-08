import { Router } from "express";
import { Container } from "typedi";
import OjcCategoriesController from "../../../controllers/ojc/OjcCategoriesController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/categories", route);
  const controller = Container.get("ojcCategoriesController") as OjcCategoriesController;

  route.get("", requirePermission("view_categories", "edit_categories"), (req, res) => controller.list(req, res));
  route.post("", requirePermission("edit_categories"), (req, res) => controller.create(req, res));
  route.patch("/:id", requirePermission("edit_categories"), (req, res) => controller.update(req, res));
  route.delete("/:id", requirePermission("edit_categories"), (req, res) => controller.remove(req, res));
};
