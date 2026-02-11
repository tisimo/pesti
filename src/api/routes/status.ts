import { Router } from "express";

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
  route.get("", (_req, res) => {
    res.json({ status: "ok" });
  });
};
