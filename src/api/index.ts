import { Router } from "express";
import status from "./routes/status";
import account from "./routes/accountRoute";
import recoveryCodesRoute from "./routes/recoveryCodesRoute";
import wallets from "./routes/walletsRoute";

export default () => {
  const app = Router();

  account(app);
  recoveryCodesRoute(app);
  wallets(app);
  status(app);

  return app;
};
