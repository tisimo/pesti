import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IUserController from "../../controllers/IControllers/IUserController";
import { requireCognitoAuth } from "../middlewares/cognitoAuth";
import { requirePermission } from "../middlewares/requirePermission";

const route = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           example: 3fa85f64-5717-4562-b3fc-2c963f66afa6
 *         email:
 *           type: string
 *           format: email
 *           example: admin@justcauses.com
 *         roleId:
 *           type: string
 *         roleIds:
 *           type: array
 *           items:
 *             type: string
 *           example: super_admin
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *           example: ACTIVE
 *         firstName:
 *           type: string
 *           example: João
 *         lastName:
 *           type: string
 *           example: Silva
 *     UserCreateInput:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: admin@justcauses.com
 *         roleId:
 *           type: string
 *           description: If omitted, the user is assigned the Default role
 *           example: r0000002-0000-4000-8000-000000000001
 *         firstName:
 *           type: string
 *           example: João
 *         lastName:
 *           type: string
 *           example: Silva
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *           example: ACTIVE
 *     UserUpdateInput:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         roleId:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *   parameters:
 *     UserId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       example: 3fa85f64-5717-4562-b3fc-2c963f66afa6
 */

export default (app: Router) => {
  app.use("/users", route);

  const controller = Container.get("userController") as IUserController;

  /**
   * @swagger
   * /api/users:
   *   post:
   *     summary: Create a new backoffice admin user
   *     tags: [Users]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserCreateInput'
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid request payload
   *       404:
   *         description: Role not found
   *       409:
   *         description: User with this email already exists
   *       500:
   *         description: Internal server error
   */
  route.post(
    "",
    requirePermission("manage_admins"),
    celebrate({
      body: Joi.object({
        email: Joi.string().trim().email().required(),
        passwordHash: Joi.string().trim().min(1).optional(),
        roleId: Joi.string().trim().min(1).optional(),
        roleIds: Joi.array().items(Joi.string().trim().min(1)).optional(),
        status: Joi.string().valid("ACTIVE", "INACTIVE").optional(),
        firstName: Joi.string().trim().allow("").optional(),
        lastName: Joi.string().trim().allow("").optional(),
      }),
    }),
    (req, res) => controller.create(req, res),
  );

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: List all backoffice admin users
   *     tags: [Users]
   *     responses:
   *       200:
   *         description: Users returned successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/User'
   *       500:
   *         description: Internal server error
   */
  route.get("", requirePermission("manage_admins"), (req, res) => controller.getAll(req, res));

  // Must be before /:id to avoid route conflict
  route.get("/me", requireCognitoAuth, (req, res) => controller.me(req, res));

  /**
   * @swagger
   * /api/users/{id}:
   *   get:
   *     summary: Get a backoffice admin user by ID
   *     tags: [Users]
   *     parameters:
   *       - $ref: '#/components/parameters/UserId'
   *     responses:
   *       200:
   *         description: User returned successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid user ID
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  route.get(
    "/:id",
    requirePermission("manage_admins"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
    }),
    (req, res) => controller.getById(req, res),
  );

  route.put(
    "/:id/roles",
    requirePermission("manage_admins"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
      body: Joi.object({
        roleIds: Joi.array().items(Joi.string().trim().min(1)).default([]),
      }),
    }),
    (req, res) => controller.update(req, res),
  );

  /**
   * @swagger
   * /api/users/{id}:
   *   put:
   *     summary: Update a backoffice admin user
   *     tags: [Users]
   *     parameters:
   *       - $ref: '#/components/parameters/UserId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserUpdateInput'
   *     responses:
   *       200:
   *         description: User updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid request payload or ID
   *       404:
   *         description: User or role not found
   *       409:
   *         description: Email already in use by another user
   *       500:
   *         description: Internal server error
   */
  route.put(
    "/:id",
    requirePermission("manage_admins"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
      body: Joi.object({
        email: Joi.string().email().trim().optional(),
        roleId: Joi.string().min(1).optional(),
        roleIds: Joi.array().items(Joi.string().trim().min(1)).optional(),
        firstName: Joi.string().trim().allow("").optional(),
        lastName: Joi.string().trim().allow("").optional(),
        status: Joi.string().valid("ACTIVE", "INACTIVE").optional(),
      }).min(1),
    }),
    (req, res) => controller.update(req, res),
  );

  /**
   * @swagger
   * /api/users/{id}/deactivate:
   *   patch:
   *     summary: Deactivate a backoffice admin user (sets status to INACTIVE)
   *     tags: [Users]
   *     parameters:
   *       - $ref: '#/components/parameters/UserId'
   *     responses:
   *       204:
   *         description: User deactivated successfully
   *       400:
   *         description: Invalid user ID
   *       404:
   *         description: User not found
   *       409:
   *         description: User is already inactive
   *       500:
   *         description: Internal server error
   */
  route.patch(
    "/:id/deactivate",
    requirePermission("manage_admins"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
    }),
    (req, res) => controller.deactivate(req, res),
  );

  route.post(
    "/:id/transfer-super-admin",
    requirePermission("manage_admins"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
    }),
    (req, res) => controller.transferSuperAdmin(req, res),
  );

  route.post(
    "/:id/reset-password",
    requirePermission("manage_admins"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
    }),
    (req, res) => controller.resetPassword(req, res),
  );

  /**
   * @swagger
   * /api/users/{id}/reactivate:
   *   patch:
   *     summary: Reactivate a backoffice admin user (sets status to ACTIVE)
   *     tags: [Users]
   *     parameters:
   *       - $ref: '#/components/parameters/UserId'
   *     responses:
   *       204:
   *         description: User reactivated successfully
   *       400:
   *         description: Invalid user ID
   *       404:
   *         description: User not found
   *       409:
   *         description: User is already active
   *       500:
   *         description: Internal server error
   */
  route.patch(
    "/:id/reactivate",
    requirePermission("manage_admins"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
    }),
    (req, res) => controller.reactivate(req, res),
  );

  /**
   * @swagger
   * /api/users/inactive/all:
   *   delete:
   *     summary: Permanently delete all inactive backoffice admin users
   *     tags: [Users]
   *     responses:
   *       200:
   *         description: Returns the number of users permanently deleted
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
  route.delete("/inactive/all", requirePermission("manage_admins"), (req, res) => controller.purgeInactive(req, res));

  /**
   * @swagger
   * /api/users/{id}:
   *   delete:
   *     summary: Permanently delete a backoffice admin user
   *     tags: [Users]
   *     parameters:
   *       - $ref: '#/components/parameters/UserId'
   *     responses:
   *       204:
   *         description: User deleted successfully
   *       400:
   *         description: Invalid user ID
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  route.delete(
    "/:id",
    requirePermission("manage_admins"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
    }),
    (req, res) => controller.delete(req, res),
  );
};
