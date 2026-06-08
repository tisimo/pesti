import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IPermissionController from "../../controllers/IControllers/IPermissionController";
import { requirePermission } from "../middlewares/requirePermission";

const route = Router();
const VALID_APPLICATIONS = ["backoffice", "just_causes"];

export default (app: Router) => {
  app.use("/permissions", route);

  route.use(requirePermission("configure_roles"));

  const controller = Container.get("permissionController") as IPermissionController;

  route.use(requirePermission("configure_roles"));

  /**
   * @swagger
   * components:
   *   schemas:
   *     Permission:
   *       type: object
   *       properties:
   *         id:
   *           type: string
   *           format: uuid
   *           example: 9d19f16b-5546-4b90-8cfa-88e9b9d90261
   *         name:
   *           type: string
   *           example: view_reports
   *         status:
   *           type: string
   *           enum: [ACTIVE, INACTIVE]
 *         category:
 *           type: string
 *           enum: [view, action, admin]
 *           example: view
 *         application:
 *           type: string
 *           enum: [backoffice, just_causes]
 *           example: just_causes
   *     PermissionErrorResponse:
   *       type: object
   *       properties:
   *         message:
   *           type: string
   */

  /**
   * @swagger
   * /api/permissions:
   *   get:
   *     summary: List all active permissions
   *     tags: [Permissions]
   *     responses:
   *       200:
   *         description: Permissions returned successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Permission'
   *       500:
   *         description: Internal server error
   */
  route.get("", (req, res) => controller.getAll(req, res));

  /**
   * @swagger
   * /api/permissions/inactive:
   *   get:
   *     summary: List all inactive (soft-deleted) permissions
   *     tags: [Permissions]
   *     responses:
   *       200:
   *         description: Inactive permissions returned successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Permission'
   *       500:
   *         description: Internal server error
   */
  route.get("/inactive", (req, res) => controller.getAllInactive(req, res));

  /**
   * @swagger
   * /api/permissions/inactive/all:
   *   delete:
   *     summary: Permanently delete all soft-deleted (inactive) permissions and remove them from all roles
   *     tags: [Permissions]
   *     responses:
   *       200:
   *         description: Returns the number of permissions permanently deleted
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 deleted:
   *                   type: integer
   *                   example: 4
   *       500:
   *         description: Internal server error
   */
  route.delete("/inactive/all", (req, res) => controller.hardDeleteAll(req, res));

  /**
   * @swagger
   * /api/permissions/{id}:
   *   get:
   *     summary: Get a permission by id
   *     tags: [Permissions]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         example: 9d19f16b-5546-4b90-8cfa-88e9b9d90261
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Permission returned successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Permission'
   *       404:
   *         description: Permission not found
   *       500:
   *         description: Internal server error
   */
  route.get(
    "/:id",
    celebrate({
      params: Joi.object({
        id: Joi.string().uuid().required(),
      }),
    }),
    (req, res) => controller.getById(req, res),
  );

  /**
   * @swagger
   * /api/permissions:
   *   post:
   *     summary: Create a new permission
   *     tags: [Permissions]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, category]
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 1
   *                 example: view_reports
   *               category:
   *                 type: integer
   *                 enum: [0, 1, 2]
   *                 description: "0 = view, 1 = action, 2 = admin"
   *                 example: 0
   *           example:
   *             name: view_reports
   *             category: 0
   *     responses:
   *       201:
   *         description: Permission created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Permission'
   *       400:
   *         description: Invalid name
   *       409:
   *         description: Permission already exists
   *       500:
   *         description: Internal server error
   */
  route.post(
    "",
    celebrate({
      body: Joi.object({
        name: Joi.string().trim().min(1).required(),
        category: Joi.number().valid(0, 1, 2).required(),
        application: Joi.string().valid(...VALID_APPLICATIONS).optional(),
      }),
    }),
    (req, res) => controller.create(req, res),
  );

  /**
   * @swagger
   * /api/permissions/{id}:
   *   put:
   *     summary: Update a permission's name and/or category
   *     tags: [Permissions]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             minProperties: 1
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 1
   *                 example: view_reports
   *               category:
   *                 type: integer
   *                 enum: [0, 1, 2]
   *                 description: "0 = view, 1 = action, 2 = admin"
   *                 example: 0
   *     responses:
   *       200:
   *         description: Permission updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Permission'
   *       400:
   *         description: Invalid request payload or id
   *       404:
   *         description: Permission not found
   *       409:
   *         description: Permission name already exists
   *       500:
   *         description: Internal server error
   */
  route.put(
    "/:id",
    celebrate({
      params: Joi.object({
        id: Joi.string().uuid().required(),
      }),
      body: Joi.object({
        name: Joi.string().trim().min(1).optional(),
        category: Joi.number().valid(0, 1, 2).optional(),
        application: Joi.string().valid(...VALID_APPLICATIONS).optional(),
      }).min(1),
    }),
    (req, res) => controller.update(req, res),
  );

  /**
   * @swagger
   * /api/permissions/{id}/reactivate:
   *   patch:
   *     summary: Reactivate a soft-deleted permission
   *     tags: [Permissions]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         example: 9d19f16b-5546-4b90-8cfa-88e9b9d90261
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Permission reactivated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Permission'
   *       404:
   *         description: Permission not found
   *       409:
   *         description: Permission is already active
   *       500:
   *         description: Internal server error
   */
  route.patch(
    "/:id/reactivate",
    celebrate({
      params: Joi.object({
        id: Joi.string().uuid().required(),
      }),
    }),
    (req, res) => controller.reactivate(req, res),
  );

  /**
   * @swagger
   * /api/permissions/{id}/deactivate:
   *   patch:
   *     summary: Soft-delete a permission (sets status to INACTIVE)
   *     tags: [Permissions]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         example: 9d19f16b-5546-4b90-8cfa-88e9b9d90261
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       204:
   *         description: Permission deactivated successfully
   *       404:
   *         description: Permission not found
   *       409:
   *         description: Permission already inactive
   *       500:
   *         description: Internal server error
   */
  route.patch(
    "/:id/deactivate",
    celebrate({
      params: Joi.object({
        id: Joi.string().uuid().required(),
      }),
    }),
    (req, res) => controller.delete(req, res),
  );

  /**
   * @swagger
   * /api/permissions/{id}/permanent:
   *   delete:
   *     summary: Permanently delete a permission (hard delete)
   *     tags: [Permissions]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         example: 9d19f16b-5546-4b90-8cfa-88e9b9d90261
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       204:
   *         description: Permission permanently deleted
   *       404:
   *         description: Permission not found
   *       500:
   *         description: Internal server error
   */
  route.delete(
    "/:id/permanent",
    celebrate({
      params: Joi.object({
        id: Joi.string().uuid().required(),
      }),
    }),
    (req, res) => controller.hardDelete(req, res),
  );
};
