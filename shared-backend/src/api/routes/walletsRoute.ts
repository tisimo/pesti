import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IWalletsController from "../../controllers/IControllers/IWalletsController";
import config from "../../../config.js";
import { requireCognitoAccount } from "../middlewares/cognitoAuth";

const route = Router();

export default (app: Router) => {
  app.use("/wallets", route);

  const ctrl = Container.get(config.controllers.wallets.name) as IWalletsController;

  /**
   * @swagger
   * /api/wallets/{walletAddress}:
   *   get:
   *     summary: Get Wallet By Address
   *     tags: [Wallets]
   *     parameters:
   *       - in: path
   *         name: walletAddress
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Requested Wallet
   *       400:
   *         description: Bad Request
   *       404:
   *         description: Wallet Not Found
   */
  route.get(
    "/:walletAddress",
    celebrate({
      params: Joi.object({
        walletAddress: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.getWalletByAddress(req, res, next),
  );

  /**
   * @swagger
   * /api/wallets/account/{accountId}:
   *   get:
   *     summary: Get Wallet By Account ID
   *     tags: [Wallets]
   *     parameters:
   *       - in: path
   *         name: accountId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Requested Wallet
   *       400:
   *         description: Bad Request
   *       404:
   *         description: Wallet Not Found
   */
  route.get(
    "/account/:accountId",
    celebrate({
      params: Joi.object({
        accountId: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.getWalletByAccountId(req, res, next),
  );

  /**
   * @swagger
   * /api/wallets:
   *   post:
   *     summary: Create Wallet
   *     tags: [Wallets]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - walletAddress
   *             properties:
   *               walletAddress:
   *                 type: string
   *     responses:
   *       201:
   *         description: Wallet Created Successfully
   *       400:
   *         description: Bad Request
   *       409:
   *         description: Wallet Already Exists
   */
  route.post(
    "",
    requireCognitoAccount,
    celebrate({
      body: Joi.object({
        walletAddress: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.createWallet(req, res, next),
  );
};
