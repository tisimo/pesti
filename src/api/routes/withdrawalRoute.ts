import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IWithdrawalController from "../../controllers/IControllers/IWithdrawalController";
import config from "../../../config.js";
import { requireCognitoAccount } from "../middlewares/cognitoAuth";

const route = Router();

export default (app: Router) => {
  app.use("/withdrawals", route);

  const ctrl = Container.get(config.controllers.withdrawal.name) as IWithdrawalController;

  /**
   * @swagger
   * /api/withdrawals/generate-session:
   *   post:
   *     summary: Generate a Coinbase offramp session token
   *     tags: [Withdrawals]
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
   *                 description: User's wallet address for the offramp session
   *     responses:
   *       200:
   *         description: Session token generated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sessionToken:
   *                   type: string
   *       400:
   *         description: Bad Request
   *       401:
   *         description: Unauthorized
   */
  route.post(
    "/generate-session",
    requireCognitoAccount,
    celebrate({
      body: Joi.object({
        walletAddress: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.generateSession(req, res, next),
  );

  /**
   * @swagger
   * /api/withdrawals/transaction-status/{partnerUserRef}:
   *   get:
   *     summary: Get the latest Coinbase offramp transaction status
   *     tags: [Withdrawals]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: partnerUserRef
   *         required: true
   *         schema:
   *           type: string
   *         description: The partner user reference (accountId)
   *     responses:
   *       200:
   *         description: Transaction status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                 sell_amount:
   *                   type: string
   *                 to_address:
   *                   type: string
   *                 asset:
   *                   type: string
   *                 network:
   *                   type: string
   *       400:
   *         description: Bad Request / No transactions found
   *       401:
   *         description: Unauthorized
   */
  route.get(
    "/transaction-status/:partnerUserRef",
    requireCognitoAccount,
    celebrate({
      params: Joi.object({
        partnerUserRef: Joi.string().required(),
      }),
    }),
    (req, res, next) => ctrl.getTransactionStatus(req, res, next),
  );
};
