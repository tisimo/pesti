import type { CognitoAuthContext } from "../middlewares/cognitoAuth";

declare global {
  namespace Express {
    interface Request {
      auth?: CognitoAuthContext
    }
  }
}