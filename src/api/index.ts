import { Router } from "express";
import account from "./routes/accountRoute";
import recoveryCodesRoute from "./routes/recoveryCodesRoute";
import status from "./routes/status";
import wallets from "./routes/walletsRoute";
import deposits from "./routes/depositRoute";

export default () => {
  const app = Router();

  account(app);
  recoveryCodesRoute(app);
  status(app);
  wallets(app);
  deposits(app);

  return app;
};
