import { Router } from "express";
import account from "./routes/accountRoute";
import recoveryCodesRoute from "./routes/recoveryCodesRoute";
import status from "./routes/status";
import wallets from "./routes/walletsRoute";

export default () => {
  const app = Router();

  account(app);
  recoveryCodesRoute(app);
  status(app);
  wallets(app);

  return app;
};
