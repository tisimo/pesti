import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IAccountCognitoController from "../../controllers/IControllers/IAccountCognitoController";
import { requirePermission } from "../middlewares/requirePermission";

const route = Router();



export default (app: Router) => {
  app.use("/cognito", route);

  const controller = Container.get("accountCognitoController") as IAccountCognitoController;

  /**

   * @swagger

   * components:

   *   schemas:

   *     Account:

   *       type: object

   *       required:

   *         - id

   *         - email

   *         - createdAt

   *         - updatedAt

   *       properties:

   *         id:

   *           type: string

   *           format: uuid

   *           example: 9d19f16b-5546-4b90-8cfa-88e9b9d90261

   *         email:

   *           type: string

   *           format: email

   *           example: user@email.com

   *         createdAt:

   *           type: string

   *           format: date-time

   *           example: 2026-03-03T10:30:00.000Z

   *         updatedAt:

   *           type: string

   *           format: date-time

   *           example: 2026-03-03T11:00:00.000Z

   *

   *     AccountCreateInput:

   *       type: object

   *       required:

   *         - email

   *       properties:

   *         email:

   *           type: string

   *           format: email

   *           example: user@email.com

   *

   *     AccountUpdateInput:

   *       type: object

   *       minProperties: 1

   *       properties:

   *         email:

   *           type: string

   *           format: email

   *           example: new@email.com

   *

   *     AccountErrorResponse:

   *       type: object

   *       properties:

   *         message:

   *           type: string

   *           example: Account not found.

   *

   *   parameters:

   *     AccountId:

   *       in: path

   *       name: id

   *       required: true

   *       schema:

   *         type: string

   *         format: uuid

   *       description: Account identifier

   */

  route.post("", requirePermission("manage_admins"), (req, res) => controller.create(req, res));
  route.get("", requirePermission("manage_admins"), (req, res) => controller.list(req, res));
};
