import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import ITransactionsController from "../../controllers/IControllers/ITransactionsController";
import TransactionsController from "../../controllers/TransactionsController";
import { requireCognitoAccount } from "../middlewares/cognitoAuth";

const route = Router();

export default (app: Router) => {
  app.use("/transactions", route);

  const ctrl = Container.get(TransactionsController) as ITransactionsController;

  /**
   * @swagger
   * /api/transactions/{page}:
   *   get:
   *     summary: Get All Transactions For Authenticated User
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: page
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number (50 transactions per page)
   *     responses:
   *       200:
   *         description: Transactions List
   *       403:
   *         description: Forbidden
   *       500:
   *         description: Error Fetching Transactions
   */
  route.get(
    "/:page",
    requireCognitoAccount,
    celebrate({
      params: Joi.object({
        page: Joi.number().integer().min(1).default(1),
      }),
    }),
    (req, res, next) => ctrl.getAllTransactions(req, res, next),
  );

  /**
   * @swagger
   * /api/transactions/{transactionId}:
   *   get:
   *     summary: Get Transaction By ID
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: transactionId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Transaction Details
   *       400:
   *         description: Transaction ID Is Required
   *       404:
   *         description: Transaction Not Found
   *       500:
   *         description: Error Finding Transaction
   */
  route.get(
    "/:transactionId",
    requireCognitoAccount,
    celebrate({
      params: Joi.object({
        transactionId: Joi.string().uuid().required(),
      }),
    }),
    (req, res, next) => ctrl.getTransactionById(req, res, next),
  );
};
