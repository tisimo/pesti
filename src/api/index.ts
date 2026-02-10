import { Router } from "express";
import status from "./routes/status";
import account from "./routes/accountRoute";
import recoveryCodesRoute from "./routes/recoveryCodesRoute";

export default () => {
  const app = Router();

  account(app);
  recoveryCodesRoute(app);
  status(app);

  return app;
};
