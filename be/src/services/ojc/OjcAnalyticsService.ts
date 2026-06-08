import { Inject, Service } from "typedi";
import OjcAnalyticsRepo, {
  AnalyticsCustomRange,
  AnalyticsData,
  AnalyticsPeriod,
  resolvePeriod,
} from "../../repos/ojc/OjcAnalyticsRepo";

export class AnalyticsRangeValidationError extends Error {}

@Service()
export default class OjcAnalyticsService {
  constructor(@Inject("ojcAnalyticsRepo") private readonly repo: OjcAnalyticsRepo) {}

  public async getAnalytics(period: AnalyticsPeriod, category?: string, customRange?: AnalyticsCustomRange): Promise<AnalyticsData> {
    if (period === "custom" && !customRange) {
      throw new AnalyticsRangeValidationError("Custom range requires both start and end dates.");
    }

    return this.repo.getAnalytics(period, category, customRange);
  }

  public resolvePeriod(raw: string): AnalyticsPeriod {
    return resolvePeriod(raw);
  }

  public resolveCustomRange(startDate?: string, endDate?: string): AnalyticsCustomRange {
    const normalizedStartDate = this.validateDateInput(startDate, "Start date");
    const normalizedEndDate = this.validateDateInput(endDate, "End date");

    if (normalizedStartDate > normalizedEndDate) {
      throw new AnalyticsRangeValidationError("End date must be the same as or later than the start date.");
    }

    return {
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
    };
  }

  private validateDateInput(value: string | undefined, label: string): string {
    if (!value) {
      throw new AnalyticsRangeValidationError(`${label} is required.`);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new AnalyticsRangeValidationError(`${label} must use the YYYY-MM-DD format.`);
    }

    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new AnalyticsRangeValidationError(`${label} is invalid.`);
    }

    return value;
  }
}
