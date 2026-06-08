import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcAnalyticsService, { AnalyticsRangeValidationError } from "../../services/ojc/OjcAnalyticsService";
import { respondWithControllerError } from "../utils/serviceErrorResponse";

@Service()
export default class OjcAnalyticsController {
  constructor(@Inject("ojcAnalyticsService") private readonly service: OjcAnalyticsService) {}

  public get = async (req: Request, res: Response): Promise<Response> => {
    try {
      const period = this.service.resolvePeriod(
        typeof req.query.period === "string" ? req.query.period : "1y",
      );
      const category = typeof req.query.category === "string" && req.query.category ? req.query.category : undefined;
      const customRange = period === "custom"
        ? this.service.resolveCustomRange(
          typeof req.query.startDate === "string" ? req.query.startDate : undefined,
          typeof req.query.endDate === "string" ? req.query.endDate : undefined,
        )
        : undefined;
      const data = await this.service.getAnalytics(period, category, customRange);
      return res.status(200).json({ ...data, period });
    } catch (error) {
      if (error instanceof AnalyticsRangeValidationError) {
        return res.status(400).json({ message: error.message });
      }

      return respondWithControllerError(res, error, {
        operation: "Loading OJC analytics",
        fallbackMessage: "Unable to load analytics. Check the OJC analytics source tables and selected filters.",
      });
    }
  };
}
