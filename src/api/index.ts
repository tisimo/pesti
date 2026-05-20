import { Router } from "express";
import account from "./routes/accountRoute";
import deposits from "./routes/depositRoute";
import recoveryCodesRoute from "./routes/recoveryCodesRoute";
import status from "./routes/status";
import transactions from "./routes/transactionsRoute";
import verification from "./routes/verificationRoute";
import wallets from "./routes/walletsRoute";
import webhooks from "./routes/webhookRoute";
import withdrawals from "./routes/withdrawalRoute";

export default () => {
  const app = Router();

  account(app);
  deposits(app);
  recoveryCodesRoute(app);
  status(app);
  transactions(app);
  verification(app);
  wallets(app);
  webhooks(app);
  withdrawals(app);

  return app;
};