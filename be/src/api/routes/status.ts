import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { requireCognitoAuth } from "../middlewares/cognitoAuth";

const route = Router();

export default (app: Router) => {
  app.use("/status", route);

  /**
   * @swagger
   * /api/status:
   *   get:
   *     summary: Check API status
   *     tags: [Status]
   *     responses:
   *       200:
   *         description: API is running
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   */
  route.get("", (req, res) => {
    res.json({ status: "ok" });
  });

  /**
   * @swagger
   * /api/status/me:
   *   get:
   *     summary: Get authenticated user information
   *     description: Returns the Cognito user identifier and accountId extracted from the JWT.
   *     tags: [Status]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Authenticated user data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 userId:
   *                   type: string
   *                   example: 123e4567-e89b-12d3-a456-426614174000
   *                 accountId:
   *                   type: string
   *                   example: acc_001
   *       401:
   *         description: Unauthorized - Invalid or missing JWT
   */

  route.get("/me", requireCognitoAuth, async (req, res) => {
    const { cognitoSub, userId } = req.auth!;

    res.json({
      cognitoSub,
      userId,
    });
  });
};
