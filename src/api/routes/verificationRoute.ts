import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IVerificationController from "../../controllers/IControllers/IVerificationController";
import config from "../../../config.js";

const route = Router();

export default (app: Router) => {
  app.use("/verifications", route);

  const ctrl = Container.get(config.controllers.verification.name) as IVerificationController;

  /**
   * @swagger
   * /api/verifications/{accountId}:
   *   get:
   *     summary: Get or create verification record for an account
   *     tags: [Verifications]
   *     parameters:
   *       - in: path
   *         name: accountId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Verification record
   *       404:
   *         description: Not Found
   */
  route.get(
    "/:accountId",
    celebrate({
      params: Joi.object({
        accountId: Joi.string().uuid().required(),
      }),
    }),
    (req, res, next) => ctrl.getVerificationStatus(req, res, next),
  );

  /**
   * @swagger
   * /api/verifications:
   *   post:
   *     summary: Get or create a PENDING verification row for an account
   *     tags: [Verifications]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountId
   *             properties:
   *               accountId:
   *                 type: string
   *                 format: uuid
   *     responses:
   *       201:
   *         description: Verification created or returned
   *       400:
   *         description: Bad Request
   */
  route.post(
    "",
    celebrate({
      body: Joi.object({
        accountId: Joi.string().uuid().required(),
      }),
    }),
    (req, res, next) => ctrl.createVerification(req, res, next),
  );

  /**
   * @swagger
   * /api/verifications/{accountId}/session:
   *   patch:
   *     summary: Record a Veriff session ID against a verification row
   *     tags: [Verifications]
   *     parameters:
   *       - in: path
   *         name: accountId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - sessionId
   *             properties:
   *               sessionId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Session recorded
   *       400:
   *         description: Bad Request
   *       404:
   *         description: Verification Not Found
   */
  route.patch(
    "/:accountId/session",
    celebrate({
      params: Joi.object({
        accountId: Joi.string().uuid().required(),
      }),
      body: Joi.object({
        sessionId: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.updateSessionId(req, res, next),
  );

  /**
   * @swagger
   * /api/verifications/session/{sessionId}/approve:
   *   patch:
   *     summary: Mark a verification as VERIFIED by session ID
   *     tags: [Verifications]
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Verification approved
   *       404:
   *         description: Verification Not Found
   */
  route.patch(
    "/session/:sessionId/approve",
    celebrate({
      params: Joi.object({
        sessionId: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.markVerified(req, res, next),
  );

  /**
   * @swagger
   * /api/verifications/session/{sessionId}/decline:
   *   patch:
   *     summary: Mark a verification as DECLINED by session ID
   *     tags: [Verifications]
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Verification declined
   *       404:
   *         description: Verification Not Found
   */
  route.patch(
    "/session/:sessionId/decline",
    celebrate({
      params: Joi.object({
        sessionId: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.markDeclined(req, res, next),
  );
};
