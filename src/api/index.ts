import { Router } from "express";
import account from "./routes/accountRoute";
import recoveryCodesRoute from "./routes/recoveryCodesRoute";
import status from "./routes/status";
import verification from "./routes/verificationRoute";
import wallets from "./routes/walletsRoute";
import deposits from "./routes/depositRoute";
import withdrawals from "./routes/withdrawalRoute";

export default () => {
  const app = Router();

  account(app);
  recoveryCodesRoute(app);
  status(app);
  verification(app);
  wallets(app);
  deposits(app);
  withdrawals(app);

  return app;
};
