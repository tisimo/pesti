import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IVerificationController from "../../controllers/IControllers/IVerificationController";
import config from "../../../config.js";
import { requireCognitoAccount } from "../middlewares/cognitoAuth";

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
   *     summary: Create a PENDING verification row for the authenticated account
   *     tags: [Verifications]
   *     responses:
   *       201:
   *         description: Verification created or returned
   *       400:
   *         description: Bad Request
   */
  route.post("", requireCognitoAccount, (req, res, next) => ctrl.createVerification(req, res, next));

  /**
   * @swagger
   * /api/verifications/session:
   *   patch:
   *     summary: Store a Veriff session ID for the authenticated account
   *     tags: [Verifications]
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
   *         description: Session ID updated
   *       400:
   *         description: Bad Request
   *       404:
   *         description: Verification Not Found
   */
  route.patch(
    "/session",
    requireCognitoAccount,
    celebrate({
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
    requireCognitoAccount,
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
    requireCognitoAccount,
    celebrate({
      params: Joi.object({
        sessionId: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.markDeclined(req, res, next),
  );
};
