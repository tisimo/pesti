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

  // Specific routes must come BEFORE the wildcard /:page route

  route.post(
    "/generate-onramp",
    requireCognitoAccount,
    celebrate({
      body: Joi.object({
        depositId: Joi.string().uuid().required(),
        depositAddress: Joi.string().required(),
        paymentAmount: Joi.string().required(),
        paymentCurrency: Joi.string().required(),
        paymentMethod: Joi.string().required(),
        accountId: Joi.string().max(50).required(),
      }),
    }),
    (req, res, next) => ctrl.createDeposit(req, res, next),
  );

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

  route.patch(
    "/:depositId/status",
    requireCognitoAccount,
    celebrate({
      params: Joi.object({
        depositId: Joi.string().uuid().required(),
      }),
      body: Joi.object({
        status: Joi.string().valid("PENDING", "COMPLETED", "FAILED").required(),
        amount: Joi.number().positive().optional(),
      }),
    }),
    (req, res, next) => ctrl.updateStatus(req, res, next),
  );

  route.get(
    "/:page",
    requireCognitoAccount,
    celebrate({
      params: Joi.object({
        page: Joi.number().integer().min(1).default(1),
      }),
    }),
    (req, res, next) => ctrl.getAllDeposits(req, res, next),
  );
};
