import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IRoleController from "../../controllers/IControllers/IRoleController";
import { requirePermission } from "../middlewares/requirePermission";

const route = Router();

const VALID_APPLICATIONS = ["backoffice", "just_causes"];

export default (app: Router) => {
  app.use("/roles", route);

  const controller = Container.get("roleController") as IRoleController;

  /**
   * @swagger
   * components:
   *   schemas:
   *     Role:
   *       type: object
   *       required:
   *         - roleId
   *         - name
   *         - permissions
   *         - application
   *       properties:
   *         roleId:
   *           type: string
   *           example: r0000002-0000-4000-8000-000000000001
   *         name:
   *           type: string
   *           example: Moderator
   *         description:
   *           type: string
   *           example: Content moderation and report management
   *         permissions:
   *           type: array
   *           items:
   *             type: string
   *           example: [view_reports, approve_reject]
   *         application:
   *           type: string
   *           enum: [backoffice, just_causes]
   *           example: just_causes
   *         isDefault:
   *           type: boolean
   *           example: false
   *         status:
   *           type: string
   *           enum: [ACTIVE, INACTIVE]
   *           example: ACTIVE
   *     RoleCreateInput:
   *       type: object
   *       required:
   *         - name
   *       properties:
   *         name:
   *           type: string
   *           minLength: 1
   *           example: Content Reviewer
   *         description:
   *           type: string
   *           example: Reviews user-submitted content
   *         application:
   *           type: string
   *           enum: [backoffice, just_causes]
   *           example: just_causes
   *         permissions:
   *           type: array
   *           items:
   *             type: string
   *             format: uuid
   *           example: []
   *     RoleUpdateInput:
   *       type: object
   *       minProperties: 1
   *       properties:
   *         name:
   *           type: string
   *           minLength: 1
   *           example: Senior Moderator
   *         permissions:
   *           type: array
   *           items:
   *             type: string
   *             format: uuid
   *           example: []
   *   parameters:
   *     RoleId:
   *       in: path
   *       name: id
   *       required: true
   *       example: r0000002-0000-4000-8000-000000000001
   *       schema:
   *         type: string
   */

  /**
   * @swagger
   * /api/roles:
   *   post:
   *     summary: Create a new role
   *     tags: [Roles]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RoleCreateInput'
   *     responses:
   *       201:
   *         description: Role created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Role'
   *       400:
   *         description: Invalid request payload
   *       409:
   *         description: Role already exists
   *       500:
   *         description: Internal server error
   */
  route.post(
    "",
    requirePermission("configure_roles"),
    celebrate({
      body: Joi.object({
        name: Joi.string().trim().min(1).required(),
        description: Joi.string().trim().min(1).optional(),
        application: Joi.string()
          .valid(...VALID_APPLICATIONS)
          .optional(),
        permissions: Joi.array().items(Joi.string().uuid()).optional(),
      }),
    }),
    (req, res) => controller.create(req, res),
  );

  /**
   * @swagger
   * /api/roles:
   *   get:
   *     summary: List roles (excludes the Default role)
   *     tags: [Roles]
   *     responses:
   *       200:
   *         description: Roles returned successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Role'
   *       500:
   *         description: Internal server error
   */
  route.get("", requirePermission("configure_roles", "manage_admins"), (req, res) => controller.getAll(req, res));

  /**
   * @swagger
   * /api/roles/{id}:
   *   get:
   *     summary: Get role by id
   *     tags: [Roles]
   *     parameters:
   *       - $ref: '#/components/parameters/RoleId'
   *     responses:
   *       200:
   *         description: Role returned successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Role'
   *       404:
   *         description: Role not found
   *       500:
   *         description: Internal server error
   */
  route.get(
    "/:id",
    requirePermission("configure_roles", "manage_admins"),
    celebrate({
      params: Joi.object({ id: Joi.string().min(1).required() }),
    }),
    (req, res) => controller.getById(req, res),
  );

  /**
   * @swagger
   * /api/roles/{id}/permissions:
   *   post:
   *     summary: Add permission to a role
   *     tags: [Roles]
   *     parameters:
   *       - $ref: '#/components/parameters/RoleId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - permissionId
   *             properties:
   *               permissionId:
   *                 type: string
   *                 format: uuid
   *                 example: 1c82f0c7-7d7c-4c3c-8b43-0d70e5c7c7a1
   *     responses:
   *       200:
   *         description: Permission added to role
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Role'
   *       404:
   *         description: Role not found
   *       500:
   *         description: Internal server error
   */
  route.post(
    "/:id/permissions",
    requirePermission("configure_roles"),
    celebrate({
      params: Joi.object({ id: Joi.string().min(1).required() }),
      body: Joi.object({
        permissionId: Joi.string().uuid().required(),
      }),
    }),
    (req, res) => controller.addPermission(req, res),
  );

  /**
   * @swagger
   * /api/roles/{id}:
   *   put:
   *     summary: Update a role
   *     tags: [Roles]
   *     parameters:
   *       - $ref: '#/components/parameters/RoleId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RoleUpdateInput'
   *     responses:
   *       200:
   *         description: Role updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Role'
   *       404:
   *         description: Role not found
   *       409:
   *         description: Role name already exists
   *       500:
   *         description: Internal server error
   */
  route.put(
    "/:id",
    requirePermission("configure_roles"),
    celebrate({
      params: Joi.object({ id: Joi.string().min(1).required() }),
      body: Joi.object({
        name: Joi.string().trim().min(1).optional(),
        description: Joi.string().trim().allow("").optional(),
        application: Joi.string()
          .valid(...VALID_APPLICATIONS)
          .optional(),
        permissions: Joi.array().items(Joi.string().uuid()).optional(),
      }).or("name", "description", "permissions", "application"),
    }),
    (req, res) => controller.update(req, res),
  );

  /**
   * @swagger
   * /api/roles/{id}:
   *   delete:
   *     summary: Delete a role (reassigns its users to the Default role)
   *     tags: [Roles]
   *     parameters:
   *       - $ref: '#/components/parameters/RoleId'
   *     responses:
   *       204:
   *         description: Role deleted successfully
   *       404:
   *         description: Role not found
   *       500:
   *         description: Internal server error
   */
  route.delete(
    "/:id",
    requirePermission("configure_roles"),
    celebrate({
      params: Joi.object({ id: Joi.string().min(1).required() }),
    }),
    (req, res) => controller.delete(req, res),
  );

  /**
   * @swagger
   * /api/roles/{id}/deactivate:
   *   patch:
   *     summary: Soft-delete a role (sets status to INACTIVE)
   *     tags: [Roles]
   *     parameters:
   *       - $ref: '#/components/parameters/RoleId'
   *     responses:
   *       204:
   *         description: Role deactivated successfully
   *       404:
   *         description: Role not found
   *       409:
   *         description: Role already inactive
   *       500:
   *         description: Internal server error
   */
  route.patch(
    "/:id/deactivate",
    requirePermission("configure_roles"),
    celebrate({
      params: Joi.object({ id: Joi.string().min(1).required() }),
    }),
    (req, res) => controller.deactivate(req, res),
  );

  /**
   * @swagger
   * /api/roles/{id}/reactivate:
   *   patch:
   *     summary: Reactivate a soft-deleted role (sets status to ACTIVE)
   *     tags: [Roles]
   *     parameters:
   *       - $ref: '#/components/parameters/RoleId'
   *     responses:
   *       204:
   *         description: Role reactivated successfully
   *       404:
   *         description: Role not found
   *       409:
   *         description: Role already active
   *       500:
   *         description: Internal server error
   */
  route.patch(
    "/:id/reactivate",
    requirePermission("configure_roles"),
    celebrate({
      params: Joi.object({ id: Joi.string().min(1).required() }),
    }),
    (req, res) => controller.reactivate(req, res),
  );

  /**
   * @swagger
   * /api/roles/inactive/all:
   *   delete:
   *     summary: Permanently delete all soft-deleted (inactive) roles
   *     tags: [Roles]
   *     responses:
   *       200:
   *         description: Returns the number of roles permanently deleted
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 deleted:
   *                   type: integer
   *                   example: 3
   *       500:
   *         description: Internal server error
   */
  route.delete("/inactive/all", requirePermission("configure_roles"), (req, res) => controller.purgeInactive(req, res));
};
