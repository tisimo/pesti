import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import config from "../../../config.js";
import { requireCognitoAccount, requireCognitoAuth } from "../middlewares/cognitoAuth";
import IRecoveryCodesController from "controllers/IControllers/IRecoveryCodesController";

const route = Router();

export default (app: Router) => {
  app.use("/recovery-codes", route);

  const ctrl = Container.get(config.controllers.recoveryCodes.name) as IRecoveryCodesController;

  /**
   * @swagger
   * /api/recovery-codes:
   *   post:
   *     summary: Generate Recovery Codes
   *     tags: [RecoveryCodes]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: false
   *     responses:
   *       201:
   *         description: Recovery Codes Generated Successfully
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Error Generating Recovery Codes
   */
  route.post(
    "",
    requireCognitoAuth,
    celebrate({
      body: Joi.object({}).unknown(false),
    }),
    (req, res, next) => ctrl.generateRecoveryCodes(req, res, next),
  );

  /**
   * @swagger
   * /api/recovery-codes/{cognitoSub}:
   *   delete:
   *     summary: Delete Recovery Code
   *     tags: [RecoveryCodes]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: cognitoSub
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: recoveryCode
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Recovery Code Deleted Successfully
   *       400:
   *         description: Bad Request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Recovery Code Not Found
   */
  route.delete(
    "/:cognitoSub/:recoveryCode",
    requireCognitoAccount,
    celebrate({
      params: Joi.object({
        cognitoSub: Joi.string().required(),
        recoveryCode: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.deleteRecoveryCode(req, res, next),
  );
};
