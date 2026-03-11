import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IDepositController from "../../controllers/IControllers/IDepositController";
import config from "../../../config.js";
import { requireCognitoAccount } from "../middlewares/cognitoAuth";

const route = Router();

export default (app: Router) => {
  app.use("/deposits", route);

  const ctrl = Container.get(config.controllers.deposit.name) as IDepositController;

  /**
   * @swagger
   * /api/deposits:
   *   post:
   *     summary: Create a Coinbase onramp deposit session
   *     tags: [Deposits]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - depositAddress
   *               - paymentAmount
   *               - paymentCurrency
   *               - paymentMethod
   *               - accountId
   *             properties:
   *               depositAddress:
   *                 type: string
   *                 description: Destination wallet address for the purchased crypto
   *               paymentAmount:
   *                 type: string
   *                 description: Fiat amount the user wants to pay (fee-inclusive)
   *               paymentCurrency:
   *                 type: string
   *                 description: Fiat currency code (e.g. USD, EUR)
   *               paymentMethod:
   *                 type: string
   *                 description: Payment method (e.g. CARD, ACH, APPLE_PAY)
   *               accountId:
   *                 type: string
   *                 description: Internal account ID used as partnerUserRef
   *     responses:
   *       201:
   *         description: Onramp session created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 depositId:
   *                   type: string
   *                 onrampUrl:
   *                   type: string
   *       400:
   *         description: Bad Request
   *       401:
   *         description: Unauthorized
   */
  route.post(
    "/generate-onramp",
    requireCognitoAccount,
    celebrate({
      body: Joi.object({
        depositAddress: Joi.string().required(),
        paymentAmount: Joi.string().required(),
        paymentCurrency: Joi.string().required(),
        paymentMethod: Joi.string().required(),
        accountId: Joi.string().max(50).required(),
      }),
    }),
    (req, res, next) => ctrl.createDeposit(req, res, next),
  );
};
