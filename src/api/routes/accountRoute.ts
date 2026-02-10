import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IAccountController from "../../controllers/IControllers/IAccountController";
import config from "../../../config.js";
import { requireCognitoAccount, requireCognitoAuth } from "../middlewares/cognitoAuth";

const route = Router();

export default (app: Router) => {
  app.use("/accounts", route);

  const ctrl = Container.get(config.controllers.account.name) as IAccountController;

  /**
   * @swagger
   * /api/accounts/by-cognito-sub/{cognitoSub}:
   *   get:
   *     summary: Get Account By Cognito Sub
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: cognitoSub
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Requested Account
   *       400:
   *         description: Bad Request
   *       404:
   *         description: Account Not Found
   */
  route.get(
    "/by-cognito-sub/:cognitoSub",
    requireCognitoAuth,
    celebrate({
      params: Joi.object({
        cognitoSub: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.getAccountByCognitoSub(req, res, next),
  );

  /**
   * @swagger
   * /api/accounts/by-account-id/{accountId}:
   *   get:
   *     summary: Get Account By Account ID
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: accountId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Requested Account
   *       400:
   *         description: Bad Request
   *       404:
   *         description: Account Not Found
   */
  route.get(
    "/by-account-id/:accountId",
    requireCognitoAccount,
    celebrate({
      params: Joi.object({
        accountId: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.getAccountByAccountId(req, res, next),
  );

  /**
   * @swagger
   * /api/accounts:
   *   post:
   *     summary: Create Account
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - cognitoSub
   *               - email
   *             properties:
   *               cognitoSub:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       201:
   *         description: Account Created Successfully
   *       400:
   *         description: Bad Request
   *       409:
   *         description: Account Already Exists
   */
  route.post(
    "",
    celebrate({
      body: Joi.object({
        cognitoSub: Joi.string().required(),
        email: Joi.string().email().required(),
      }),
    }),
    (req, res, next) => ctrl.createAccount(req, res, next),
  );

  /**
   * @swagger
   * /api/accounts/by-cognito-sub/{cognitoSub}:
   *   delete:
   *     summary: Delete Account By Cognito Sub
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: cognitoSub
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Account Deleted Successfully
   *       400:
   *         description: Bad Request
   *       404:
   *         description: Account Not Found
   */
  route.delete(
    "/by-cognito-sub/:cognitoSub",
    requireCognitoAuth,
    celebrate({
      params: Joi.object({
        cognitoSub: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.deleteAccountByCognitoSub(req, res, next),
  );
};
