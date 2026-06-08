import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import "./analyticsPage.css";

type AnalyticsPeriod = "1d" | "1w" | "2w" | "1m" | "3m" | "6m" | "1y" | "all" | "custom";

interface AnalyticsCustomRange {
  startDate: string;
  endDate: string;
}

interface DataPoint {
  key: string;
  count: number;
  total?: number;
}

interface TopCampaign {
  campaignId: string;
  title: string;
  category: string;
  amountRaised: number;
  goalAmount: number;
  donorCount: number;
}

interface TopDonor {
  profileId: string | null;
  donorName: string;
  username: string | null;
  donationCount: number;
  totalDonated: number;
}

interface TopCreator {
  profileId: string;
  creatorName: string;
  username: string | null;
  campaignCount: number;
  totalRaised: number;
}

interface CategoryStat {
  category: string;
  campaignCount: number;
  totalRaised: number;
  activeCampaigns: number;
}

interface DonationStatusStat {
  status: string;
  count: number;
  total: number;
}

interface AnalyticsSummary {
  totalUsers: number;
  totalCampaigns: number;
  totalRaised: number;
  activeCampaigns: number;
  pendingApprovals: number;
  newUsers30d: number;
  donationFeeRevenue: number;
  tipRevenue: number;
  withdrawalFeeRevenue: number;
  platformRevenue: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  period: AnalyticsPeriod;
  bucketTrunc: "hour" | "day" | "week" | "month" | "quarter" | "year";
  donationsByPeriod: DataPoint[];
  tipRevenueByPeriod: DataPoint[];
  withdrawalFeesByPeriod: DataPoint[];
  usersByPeriod: DataPoint[];
  campaignsByPeriod: DataPoint[];
  topCampaigns: TopCampaign[];
  topDonors: TopDonor[];
  topCreators: TopCreator[];
  donationsByStatus: DonationStatusStat[];
  categoryBreakdown: CategoryStat[];
}

type ChartAxisSide = "left" | "right";
type TrendView = "donation_volume" | "revenue" | "users" | "causes";
type RankingView = "causes" | "donors" | "creators";
type CategoryRankingMetric = "raised" | "causes" | "active";
type CalendarField = "start" | "end";
interface ChartPoint {
  x: number;
  y: number;
}

interface TrendSeries {
  label: string;
  color: string;
  values: number[];
  axis?: ChartAxisSide;
  fill?: boolean;
}
type AxisMode = "count" | "currency";
type SheetCell = string | number | null;

interface ExportTrendRow {
  periodKey: string;
  completedDonations: number;
  donationVolume: number;
  revenue: number;
  users: number;
  causes: number;
}

interface AnalyticsExportContext {
  fileBase: string;
  generatedLabel: string;
  periodLabel: string;
  categoryLabel: string;
  selectedDonationVolume: number;
  selectedTipRevenue: number;
  selectedWithdrawalFeeRevenue: number;
  selectedRevenue: number;
  selectedCompletedDonations: number;
  selectedUsers: number;
  selectedCauses: number;
  trendRows: ExportTrendRow[];
}

function darkenHexColor(hex: string, amount = 0.18): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;

  const channels = normalized.match(/.{2}/g);
  if (!channels) return hex;

  const next = channels
    .map((channel) => {
      const value = parseInt(channel, 16);
      const adjusted = Math.max(0, Math.min(255, Math.round(value * (1 - amount))));
      return adjusted.toString(16).padStart(2, "0");
    })
    .join("");

  return `#${next}`;
}

const PERIOD_OPTIONS: Array<{ label: string; value: AnalyticsPeriod }> = [
  { label: "1 day", value: "1d" },
  { label: "1 week", value: "1w" },
  { label: "2 weeks", value: "2w" },
  { label: "1 month", value: "1m" },
  { label: "3 months", value: "3m" },
  { label: "6 months", value: "6m" },
  { label: "1 year", value: "1y" },
  { label: "All time", value: "all" },
  { label: "Custom range", value: "custom" },
];

const TREND_OPTIONS: Array<{ label: string; value: TrendView }> = [
  { label: "Donation volume", value: "donation_volume" },
  { label: "Revenue", value: "revenue" },
  { label: "Users", value: "users" },
  { label: "Causes", value: "causes" },
];

const RANKING_OPTIONS: Array<{ label: string; value: RankingView }> = [
  { label: "Top causes", value: "causes" },
  { label: "Top donors", value: "donors" },
  { label: "Top creators", value: "creators" },
];

const CATEGORY_RANKING_OPTIONS: Array<{ label: string; value: CategoryRankingMetric }> = [
  { label: "Amount raised", value: "raised" },
  { label: "Cause count", value: "causes" },
  { label: "Active causes", value: "active" },
];

const PLATFORM_FEE = 0.07;
function formatCurrency(value: number, compact = false): string {
  const shouldCompact = compact && Math.abs(value) >= 1000;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "USD",
    notation: shouldCompact ? "compact" : "standard",
    maximumFractionDigits: shouldCompact || Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value);
}

function formatCurrencyExact(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IE").format(value);
}

function formatCountCompact(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatAxisCount(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value);
}

function formatAxisCurrency(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(value) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) < 10 ? 2 : 0,
  }).format(value);
}

function parseDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return null;
  }

  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatWeekRange(key: string): string {
  const start = parseDateKey(key);
  if (!start) {
    return key;
  }

  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 6);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function formatAxisKey(key: string, period: AnalyticsPeriod, bucketTrunc: AnalyticsData["bucketTrunc"]): string {
  if (bucketTrunc === "hour" || period === "1d" || /^\d{4}-\d{2}-\d{2} \d{2}$/.test(key)) {
    const hour = key.split(" ")[1] ?? key;
    return `${hour}:00`;
  }

  if (bucketTrunc === "week") {
    return formatWeekRange(key);
  }

  if (/^\d{4}-Q[1-4]$/.test(key)) {
    const [year, quarter] = key.split("-");
    return `${quarter} ${year}`;
  }

  if (/^\d{4}$/.test(key)) {
    return key;
  }

  if (/^\d{4}-\d{2}$/.test(key)) {
    const [year, month] = key.split("-");
    if (!year || !month) return key;
    return new Date(Number(year), Number(month) - 1).toLocaleString("en", { month: "short", year: "numeric" });
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const [year, month, day] = key.split("-");
    if (!year || !month || !day) return key;
    return `${day} ${new Date(Number(year), Number(month) - 1).toLocaleString("en", { month: "short" })}`;
  }

  return key;
}

function sumCount(points: DataPoint[]): number {
  return points.reduce((total, point) => total + point.count, 0);
}

function sumTotal(points: DataPoint[]): number {
  return points.reduce((total, point) => total + (point.total ?? 0), 0);
}

function pointMap(points: DataPoint[]): Map<string, DataPoint> {
  return new Map(points.map((point) => [point.key, point]));
}

function sortedPeriodKeys(...series: DataPoint[][]): string[] {
  return Array.from(new Set(series.flatMap((points) => points.map((point) => point.key)))).sort();
}

function valuesForKeys(keys: string[], points: DataPoint[], valueGetter: (point: DataPoint) => number): number[] {
  const byKey = pointMap(points);
  return keys.map((key) => {
    const point = byKey.get(key);
    return point ? valueGetter(point) : 0;
  });
}

function revenueForPeriod(
  donationPoint: DataPoint | undefined,
  tipPoint: DataPoint | undefined,
  withdrawalFeePoint: DataPoint | undefined,
): number {
  return ((donationPoint?.total ?? 0) * PLATFORM_FEE) + (tipPoint?.total ?? 0) + (withdrawalFeePoint?.total ?? 0);
}

function buildRevenuePoints(data: AnalyticsData): DataPoint[] {
  const keys = sortedPeriodKeys(data.donationsByPeriod, data.tipRevenueByPeriod ?? [], data.withdrawalFeesByPeriod ?? []);
  const donationsByKey = pointMap(data.donationsByPeriod);
  const tipsByKey = pointMap(data.tipRevenueByPeriod ?? []);
  const withdrawalFeesByKey = pointMap(data.withdrawalFeesByPeriod ?? []);

  return keys.map((key) => ({
    key,
    count: donationsByKey.get(key)?.count ?? 0,
    total: revenueForPeriod(donationsByKey.get(key), tipsByKey.get(key), withdrawalFeesByKey.get(key)),
  }));
}

function sanitizeFilePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildExportBaseName(period: string, categoryLabel: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const periodPart = sanitizeFilePart(period) || "range";
  const categoryPart = categoryLabel !== "All categories" ? `-${sanitizeFilePart(categoryLabel) || "category"}` : "";
  return `analytics-${date}-${periodPart}${categoryPart}`;
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultCustomRange(): AnalyticsCustomRange {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 29);

  return {
    startDate: formatDateInputValue(startDate),
    endDate: formatDateInputValue(endDate),
  };
}

function formatDateLabel(value: string): string {
  const parsed = parseDateKey(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function formatCustomRangeLabel(range: AnalyticsCustomRange): string {
  return `${formatDateLabel(range.startDate)} - ${formatDateLabel(range.endDate)}`;
}

function validateCustomRangeDraft(range: AnalyticsCustomRange): string | null {
  if (!range.startDate || !range.endDate) {
    return "Select both start and end dates.";
  }

  if (range.startDate > range.endDate) {
    return "End date must be the same as or later than the start date.";
  }

  return null;
}

const DEFAULT_CUSTOM_RANGE = createDefaultCustomRange();
const CALENDAR_WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseCalendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function startOfCalendarMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addCalendarMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameCalendarDate(left: Date | null, right: Date | null): boolean {
  return Boolean(
    left
    && right
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate(),
  );
}

function buildCalendarDays(month: Date): Date[] {
  const firstDayOfMonth = startOfCalendarMonth(month);
  const gridStart = new Date(firstDayOfMonth);
  gridStart.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function formatCalendarMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function isDateWithinRange(dateValue: string, startDate: string, endDate: string): boolean {
  return dateValue > startDate && dateValue < endDate;
}

function categoryMetricValue(entry: CategoryStat, metric: CategoryRankingMetric): number {
  if (metric === "causes") {
    return entry.campaignCount;
  }

  if (metric === "active") {
    return entry.activeCampaigns;
  }

  return entry.totalRaised;
}

function formatCategoryMetricValue(entry: CategoryStat, metric: CategoryRankingMetric): string {
  if (metric === "causes") {
    return `${formatCount(entry.campaignCount)} causes`;
  }

  if (metric === "active") {
    return `${formatCount(entry.activeCampaigns)} active`;
  }

  return formatCurrency(entry.totalRaised);
}

function categoryMetricShareLabel(metric: CategoryRankingMetric): string {
  if (metric === "causes") {
    return "total causes";
  }

  if (metric === "active") {
    return "total active causes";
  }

  return "total raised";
}

function categoryMetricHeading(metric: CategoryRankingMetric): string {
  if (metric === "causes") {
    return "Top categories by cause count";
  }

  if (metric === "active") {
    return "Top categories by active causes";
  }

  return "Top categories by amount raised";
}

function formatPercentage(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value);
}

function buildTrendRows(data: AnalyticsData): ExportTrendRow[] {
  const orderedKeys = sortedPeriodKeys(
    data.donationsByPeriod,
    data.tipRevenueByPeriod ?? [],
    data.withdrawalFeesByPeriod ?? [],
    data.usersByPeriod,
    data.campaignsByPeriod,
  );

  const donationsByKey = pointMap(data.donationsByPeriod);
  const tipsByKey = pointMap(data.tipRevenueByPeriod ?? []);
  const withdrawalFeesByKey = pointMap(data.withdrawalFeesByPeriod ?? []);
  const usersByKey = pointMap(data.usersByPeriod);
  const causesByKey = pointMap(data.campaignsByPeriod);

  return orderedKeys.map((periodKey) => {
    const donationPoint = donationsByKey.get(periodKey);
    const tipPoint = tipsByKey.get(periodKey);
    const withdrawalFeePoint = withdrawalFeesByKey.get(periodKey);
    const usersPoint = usersByKey.get(periodKey);
    const causesPoint = causesByKey.get(periodKey);
    const donationVolume = donationPoint?.total ?? 0;

    return {
      periodKey,
      completedDonations: donationPoint?.count ?? 0,
      donationVolume,
      revenue: revenueForPeriod(donationPoint, tipPoint, withdrawalFeePoint),
      users: usersPoint?.count ?? 0,
      causes: causesPoint?.count ?? 0,
    };
  });
}

function buildExportContext(data: AnalyticsData, periodLabel: string, categoryLabel: string): AnalyticsExportContext {
  const generated = new Date();
  const selectedDonationVolume = sumTotal(data.donationsByPeriod);
  const selectedTipRevenue = sumTotal(data.tipRevenueByPeriod ?? []);
  const selectedWithdrawalFeeRevenue = sumTotal(data.withdrawalFeesByPeriod ?? []);
  const selectedRevenue = selectedDonationVolume * PLATFORM_FEE + selectedTipRevenue + selectedWithdrawalFeeRevenue;
  const selectedCompletedDonations = sumCount(data.donationsByPeriod);
  const selectedUsers = sumCount(data.usersByPeriod);
  const selectedCauses = sumCount(data.campaignsByPeriod);

  return {
    fileBase: buildExportBaseName(periodLabel, categoryLabel),
    generatedLabel: new Intl.DateTimeFormat("en-IE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(generated),
    periodLabel,
    categoryLabel,
    selectedDonationVolume,
    selectedTipRevenue,
    selectedWithdrawalFeeRevenue,
    selectedRevenue,
    selectedCompletedDonations,
    selectedUsers,
    selectedCauses,
    trendRows: buildTrendRows(data),
  };
}

function measureSheetColumns(rows: SheetCell[][]): XLSX.ColInfo[] {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);

  return Array.from({ length: width }, (_, columnIndex) => {
    const longest = rows.reduce((max, row) => {
      const raw = row[columnIndex];
      const length = raw == null ? 0 : String(raw).length;
      return Math.max(max, length);
    }, 0);

    return { wch: Math.min(Math.max(longest + 2, 10), 42) };
  });
}

function createWorkbookSheet(rows: SheetCell[][], autofilterRow?: number): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = measureSheetColumns(rows);

  if (typeof autofilterRow === "number" && rows.length > autofilterRow + 1 && rows[autofilterRow]?.length) {
    sheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: autofilterRow, c: 0 },
        e: { r: rows.length - 1, c: rows[autofilterRow].length - 1 },
      }),
    };
  }

  return sheet;
}

function tickIndexes(length: number, maxTicks = 7): number[] {
  if (length <= maxTicks) {
    return Array.from({ length }, (_, index) => index);
  }

  return Array.from({ length: maxTicks }, (_, index) => Math.round((index / (maxTicks - 1)) * (length - 1)))
    .filter((value, index, values) => values.indexOf(value) === index);
}

function axisTicks(max: number, steps = 4): number[] {
  return Array.from({ length: steps + 1 }, (_, index) => max - (max / steps) * index);
}

function normalizeAxisMax(value: number, mode: AxisMode): number {
  if (value <= 0) return 1;

  if (mode === "count" && value <= 5) {
    return Math.ceil(value) + 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const steps = [1, 1.5, 2, 2.5, 5, 7.5, 10];
  const nextStep = steps.find((step) => normalized < step);

  return (nextStep ?? 10) * magnitude;
}

function resolveAxisTicks(maxValue: number, mode: AxisMode): number[] {
  const normalizedMax = normalizeAxisMax(maxValue, mode);

  if (mode === "count" && normalizedMax <= 6) {
    return Array.from({ length: Math.ceil(normalizedMax) + 1 }, (_, index) => Math.ceil(normalizedMax) - index);
  }

  return axisTicks(normalizedMax);
}

function xPosition(index: number, count: number, width: number, paddingX: number): number {
  if (count <= 1) {
    return paddingX + width / 2;
  }

  return paddingX + (index / (count - 1)) * width;
}

function yPosition(value: number, max: number, height: number, paddingY: number): number {
  if (max <= 0) {
    return paddingY + height;
  }

  return paddingY + height - (value / max) * height;
}

function buildChartPoints(values: number[], max: number, width: number, height: number, paddingX: number, paddingY: number): ChartPoint[] {
  return values.map((value, index) => ({
    x: xPosition(index, values.length, width, paddingX),
    y: yPosition(value, max, height, paddingY),
  }));
}

function buildLinePath(values: number[], max: number, width: number, height: number, paddingX: number, paddingY: number): string {
  const points = buildChartPoints(values, max, width, height, paddingX, paddingY);
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildAreaPath(values: number[], max: number, width: number, height: number, paddingX: number, paddingY: number): string {
  const points = buildChartPoints(values, max, width, height, paddingX, paddingY);
  if (!points.length) {
    return "";
  }

  const baseline = paddingY + height;
  return `${buildLinePath(values, max, width, height, paddingX, paddingY)} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
}

function SummaryCard({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) {
  return (
    <article className="analytics-summary-card" style={{ "--analytics-accent": accent } as CSSProperties}>
      <span className="analytics-summary-card__label">{label}</span>
      <strong className="analytics-summary-card__value">{value}</strong>
      <span className="analytics-summary-card__note">{note}</span>
    </article>
  );
}

function RangeCalendarField({
  label,
  field,
  value,
  counterpartValue,
  rangeStart,
  rangeEnd,
  open,
  visibleMonth,
  minValue,
  onOpen,
  onMonthChange,
  onSelect,
}: {
  label: string;
  field: CalendarField;
  value: string;
  counterpartValue: string;
  rangeStart: string;
  rangeEnd: string;
  open: boolean;
  visibleMonth: Date;
  minValue?: string;
  onOpen: () => void;
  onMonthChange: (delta: number) => void;
  onSelect: (nextValue: string) => void;
}) {
  const days = buildCalendarDays(visibleMonth);
  const selectedDate = parseCalendarDate(value);
  const counterpartDate = parseCalendarDate(counterpartValue);
  const currentMonth = visibleMonth.getMonth();

  return (
    <div className="analytics-custom-range__field analytics-custom-range__field--calendar">
      <span>{label}</span>
      <button
        type="button"
        className={`analytics-custom-range__trigger${open ? " analytics-custom-range__trigger--open" : ""}`}
        onClick={onOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span>{formatDateLabel(value)}</span>
        <i className="bi bi-calendar3" />
      </button>

      {open ? (
        <div className="analytics-calendar" role="dialog" aria-label={`${label} calendar`}>
          <div className="analytics-calendar__header">
            <strong>{formatCalendarMonthLabel(visibleMonth)}</strong>
            <div className="analytics-calendar__nav">
              <button type="button" onClick={() => onMonthChange(-1)} aria-label="Previous month">
                <i className="bi bi-chevron-left" />
              </button>
              <button type="button" onClick={() => onMonthChange(1)} aria-label="Next month">
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>

          <div className="analytics-calendar__weekdays" aria-hidden="true">
            {CALENDAR_WEEKDAY_LABELS.map((weekday) => <span key={`${field}-${weekday}`}>{weekday}</span>)}
          </div>

          <div className="analytics-calendar__grid">
            {days.map((day) => {
              const dayValue = formatDateInputValue(day);
              const disabled = Boolean(minValue && dayValue < minValue);
              const inMonth = day.getMonth() === currentMonth;
              const selected = isSameCalendarDate(day, selectedDate);
              const counterpart = !selected && isSameCalendarDate(day, counterpartDate);
              const inRange = isDateWithinRange(dayValue, rangeStart, rangeEnd);

              return (
                <button
                  key={`${field}-${dayValue}`}
                  type="button"
                  className={[
                    "analytics-calendar__day",
                    inMonth ? "" : " analytics-calendar__day--outside",
                    selected ? " analytics-calendar__day--selected" : "",
                    counterpart ? " analytics-calendar__day--counterpart" : "",
                    inRange ? " analytics-calendar__day--in-range" : "",
                  ].join("")}
                  onClick={() => onSelect(dayValue)}
                  disabled={disabled}
                  aria-pressed={selected}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TrendChart({
  labels,
  series,
  period,
  bucketTrunc,
  leftFormatter,
  rightFormatter,
  leftAxisMode = "count",
  rightAxisMode = "count",
}: {
  labels: string[];
  series: TrendSeries[];
  period: AnalyticsPeriod;
  bucketTrunc: AnalyticsData["bucketTrunc"];
  leftFormatter: (value: number) => string;
  rightFormatter?: (value: number) => string;
  leftAxisMode?: AxisMode;
  rightAxisMode?: AxisMode;
}) {
  const chartId = useId().replace(/:/g, "");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const leftSeries = series.filter((entry) => (entry.axis ?? "left") === "left");
  const rightSeries = series.filter((entry) => entry.axis === "right");
  const leftMax = normalizeAxisMax(Math.max(...leftSeries.flatMap((entry) => entry.values), 1), leftAxisMode);
  const rightMax = rightSeries.length
    ? normalizeAxisMax(Math.max(...rightSeries.flatMap((entry) => entry.values), 1), rightAxisMode)
    : 0;
  const viewBoxWidth = 1000;
  const viewBoxHeight = 300;
  const paddingLeft = 72;
  const paddingRight = rightSeries.length ? 76 : 28;
  const paddingTop = 24;
  const paddingBottom = 44;
  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
  const chartHeight = viewBoxHeight - paddingTop - paddingBottom;
  const ticks = tickIndexes(labels.length);
  const yTicks = resolveAxisTicks(Math.max(...leftSeries.flatMap((entry) => entry.values), 1), leftAxisMode);
  const rightTicks = rightSeries.length
    ? resolveAxisTicks(Math.max(...rightSeries.flatMap((entry) => entry.values), 1), rightAxisMode)
    : [];
  const activeIndex = hoverIndex ?? Math.max(labels.length - 1, 0);
  const activeLabel = labels.length ? formatAxisKey(labels[activeIndex], period, bucketTrunc) : null;
  const latestLabel = labels.length ? formatAxisKey(labels[Math.max(labels.length - 1, 0)], period, bucketTrunc) : null;
  const densePointRadius = labels.length > 28 ? 2.75 : labels.length > 18 ? 3.25 : 4.5;
  const densePointOpacity = labels.length > 28 ? 0.55 : labels.length > 18 ? 0.72 : 1;
  const densePointStroke = labels.length > 28 ? 1.25 : labels.length > 18 ? 1.5 : 2;

  function seriesMax(entry: TrendSeries): number {
    return (entry.axis ?? "left") === "right" ? rightMax : leftMax;
  }

  function seriesPath(entry: TrendSeries): string {
    return buildLinePath(entry.values, seriesMax(entry), chartWidth, chartHeight, paddingLeft, paddingTop);
  }

  function seriesIsFlat(entry: TrendSeries): boolean {
    const minValue = Math.min(...entry.values);
    const maxValue = Math.max(...entry.values);
    return maxValue === minValue;
  }

  function seriesStroke(entry: TrendSeries): string {
    return darkenHexColor(entry.color, seriesIsFlat(entry) ? 0.16 : 0.28);
  }

  function seriesStrokeWidth(entry: TrendSeries): number {
    return seriesIsFlat(entry) ? 4 : 5;
  }

  function seriesFilter(entry: TrendSeries): string {
    return `url(#${chartId}-glow-${series.indexOf(entry)})`;
  }

  function seriesArea(entry: TrendSeries): string {
    return buildAreaPath(entry.values, seriesMax(entry), chartWidth, chartHeight, paddingLeft, paddingTop);
  }

  function flatSeriesY(entry: TrendSeries): number {
    return yPosition(entry.values[0] ?? 0, seriesMax(entry), chartHeight, paddingTop);
  }

  function hoverBounds(index: number): { startX: number; endX: number } {
    const pointCount = labels.length;
    const currentX = xPosition(index, pointCount, chartWidth, paddingLeft);
    const nextX = index < pointCount - 1 ? xPosition(index + 1, pointCount, chartWidth, paddingLeft) : paddingLeft + chartWidth;
    const previousX = index > 0 ? xPosition(index - 1, pointCount, chartWidth, paddingLeft) : paddingLeft;
    return {
      startX: index === 0 ? paddingLeft : (previousX + currentX) / 2,
      endX: index === pointCount - 1 ? paddingLeft + chartWidth : (currentX + nextX) / 2,
    };
  }

  const tooltipLeft = `${((xPosition(activeIndex, labels.length, chartWidth, paddingLeft) / viewBoxWidth) * 100).toFixed(2)}%`;
  const activeBand = labels.length ? hoverBounds(activeIndex) : null;

  return (
    <div className="analytics-trend-chart">
      <div className="analytics-trend-chart__topbar">
        <div className="analytics-trend-chart__legend">
          {series.map((entry) => (
            <span key={entry.label} className="analytics-trend-chart__legend-item">
              <span className="analytics-trend-chart__legend-dot" style={{ backgroundColor: entry.color }} />
              {entry.label}
            </span>
          ))}
        </div>
        {latestLabel ? (
          <div className="analytics-trend-chart__status">
            <span>{hoverIndex === null ? "Latest point" : "Selected point"}</span>
            <strong>{hoverIndex === null ? latestLabel : activeLabel}</strong>
          </div>
        ) : null}
      </div>

      <div className="analytics-trend-chart__surface">
        {labels.length ? (
          <div
            className={`analytics-trend-chart__tooltip${hoverIndex === null ? " analytics-trend-chart__tooltip--muted" : ""}`}
            style={{ left: tooltipLeft }}
          >
            <strong>{formatAxisKey(labels[activeIndex], period, bucketTrunc)}</strong>
            {series.map((entry) => (
              <span key={`${entry.label}-tooltip`}>
                <i style={{ backgroundColor: entry.color }} />
                {entry.label}: {((entry.axis ?? "left") === "right" ? rightFormatter : leftFormatter)?.(entry.values[activeIndex] ?? 0)}
              </span>
            ))}
          </div>
        ) : null}

        <svg
          className="analytics-trend-chart__svg"
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          role="img"
          aria-label="Analytics trend chart"
          onMouseLeave={() => setHoverIndex(null)}
        >
        <defs>
          {series.map((entry, index) => (
            <linearGradient key={`${entry.label}-gradient`} id={`${chartId}-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={entry.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={entry.color} stopOpacity="0.03" />
            </linearGradient>
          ))}
          {series.map((entry, index) => (
            <filter key={`${entry.label}-glow`} id={`${chartId}-glow-${index}`} x="-10%" y="-10%" width="120%" height="140%">
              <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor={entry.color} floodOpacity="0.14" />
            </filter>
          ))}
        </defs>

        {ticks.map((index) => {
          const x = xPosition(index, labels.length, chartWidth, paddingLeft);
          return <line key={`vertical-${labels[index]}-${index}`} x1={x} x2={x} y1={paddingTop} y2={paddingTop + chartHeight} className="analytics-trend-chart__grid-guide" />;
        })}

        {yTicks.slice(0, -1).map((tick) => {
          const y = yPosition(tick, leftMax, chartHeight, paddingTop);
          return <line key={tick} x1={paddingLeft} x2={paddingLeft + chartWidth} y1={y} y2={y} className="analytics-trend-chart__grid-line" />;
        })}

        <line
          x1={paddingLeft}
          x2={paddingLeft + chartWidth}
          y1={paddingTop + chartHeight}
          y2={paddingTop + chartHeight}
          className="analytics-trend-chart__baseline"
        />

        {yTicks.map((tick) => {
          const y = yPosition(tick, leftMax, chartHeight, paddingTop);
          return (
            <text key={`left-${tick}`} x={paddingLeft - 12} y={y + 4} textAnchor="end" className="analytics-trend-chart__y-tick">
              {leftAxisMode === "currency" ? formatAxisCurrency(tick) : formatAxisCount(tick)}
            </text>
          );
        })}

        {rightSeries.length
          ? rightTicks.map((tick) => {
              const y = yPosition(tick, rightMax, chartHeight, paddingTop);
              return (
                <text key={`right-${tick}`} x={paddingLeft + chartWidth + 12} y={y + 4} textAnchor="start" className="analytics-trend-chart__y-tick analytics-trend-chart__y-tick--right">
                  {rightAxisMode === "currency" ? formatAxisCurrency(tick) : formatAxisCount(tick)}
                </text>
              );
            })
          : null}

        {activeBand ? (
          <rect
            x={activeBand.startX}
            y={paddingTop}
            width={activeBand.endX - activeBand.startX}
            height={chartHeight}
            className="analytics-trend-chart__active-band"
          />
        ) : null}

        {series.map((entry) => (
          <g key={entry.label}>
            {entry.fill ? <path d={seriesArea(entry)} fill={`url(#${chartId}-gradient-${series.indexOf(entry)})`} /> : null}
            <path
              d={seriesPath(entry)}
              fill="none"
              stroke={seriesStroke(entry)}
              strokeWidth={String(seriesStrokeWidth(entry))}
              strokeLinejoin="round"
              strokeLinecap="round"
              filter={seriesFilter(entry)}
              strokeOpacity="0.98"
            />
            {seriesIsFlat(entry) ? (
              <line
                x1={paddingLeft}
                x2={paddingLeft + chartWidth}
                y1={flatSeriesY(entry)}
                y2={flatSeriesY(entry)}
                stroke={darkenHexColor(entry.color, 0.34)}
                strokeWidth="3.5"
                strokeLinecap="round"
                shapeRendering="geometricPrecision"
              />
            ) : null}
            {entry.values.map((value, pointIndex) => {
              const x = xPosition(pointIndex, entry.values.length, chartWidth, paddingLeft);
              const y = yPosition(value, seriesMax(entry), chartHeight, paddingTop);
              const isActive = pointIndex === activeIndex;
              return (
                <circle
                  key={`${entry.label}-${labels[pointIndex]}`}
                  cx={x}
                  cy={y}
                  r={isActive ? "6.5" : String(densePointRadius)}
                  fill={seriesStroke(entry)}
                  stroke="#ffffff"
                  strokeWidth={isActive ? "3" : String(densePointStroke)}
                  className={isActive ? "analytics-trend-chart__point analytics-trend-chart__point--active" : "analytics-trend-chart__point"}
                  style={isActive ? undefined : { opacity: densePointOpacity }}
                >
                  <title>{`${entry.label}: ${((entry.axis ?? "left") === "right" ? rightFormatter : leftFormatter)?.(value) ?? value} (${formatAxisKey(labels[pointIndex], period, bucketTrunc)})`}</title>
                </circle>
              );
            })}
          </g>
        ))}

        {labels.length ? (
          <line
            x1={xPosition(activeIndex, labels.length, chartWidth, paddingLeft)}
            x2={xPosition(activeIndex, labels.length, chartWidth, paddingLeft)}
            y1={paddingTop}
            y2={paddingTop + chartHeight}
            className="analytics-trend-chart__focus-line"
          />
        ) : null}

        {labels.map((label, index) => {
          const band = hoverBounds(index);
          return (
            <rect
              key={`${label}-hover`}
              x={band.startX}
              y={paddingTop}
              width={band.endX - band.startX}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(index)}
            />
          );
        })}

        {ticks.map((index) => {
          const x = xPosition(index, labels.length, chartWidth, paddingLeft);
          return (
            <text
              key={`${labels[index]}-${index}`}
              x={x}
              y={viewBoxHeight - 10}
              textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}
              className="analytics-trend-chart__tick"
            >
              {formatAxisKey(labels[index], period, bucketTrunc)}
            </text>
          );
        })}
        </svg>
      </div>
    </div>
  );
}

function exportWorkbook(data: AnalyticsData, periodLabel: string, categoryLabel: string) {
  const context = buildExportContext(data, periodLabel, categoryLabel);
  const workbook = XLSX.utils.book_new();

  const overviewRows: SheetCell[][] = [
    ["Platform Analytics Export"],
    ["Generated", context.generatedLabel],
    ["Date range", context.periodLabel],
    ["Category", context.categoryLabel],
    [],
    ["Platform summary"],
    ["Metric", "Value"],
    ["Total users", data.summary.totalUsers],
    ["Total causes", data.summary.totalCampaigns],
    ["Total raised", data.summary.totalRaised],
    ["Active causes", data.summary.activeCampaigns],
    ["Pending approvals", data.summary.pendingApprovals],
    ["New users (30 days)", data.summary.newUsers30d],
    ["Donation fee revenue (7%)", data.summary.donationFeeRevenue],
    ["Tip revenue", data.summary.tipRevenue ?? 0],
    ["Withdrawal fee revenue (3%)", data.summary.withdrawalFeeRevenue],
    ["Platform revenue (7% donations + tips + 3% withdrawals)", data.summary.platformRevenue],
    [],
    ["Selected view"],
    ["Metric", "Value"],
    ["Donation volume", context.selectedDonationVolume],
    ["Tip revenue", context.selectedTipRevenue],
    ["Withdrawal fee revenue (3%)", context.selectedWithdrawalFeeRevenue],
    ["Revenue", context.selectedRevenue],
    ["Completed donations", context.selectedCompletedDonations],
    ["Users in range", context.selectedUsers],
    ["Causes in range", context.selectedCauses],
  ];

  const trendsRows: SheetCell[][] = [
    ["Period", "Completed donations", "Donation volume", "Revenue", "Users", "Causes"],
    ...context.trendRows.map((row) => [
      row.periodKey,
      row.completedDonations,
      row.donationVolume,
      row.revenue,
      row.users,
      row.causes,
    ]),
  ];

  const topCausesRows: SheetCell[][] = [
    ["Rank", "Cause", "Category", "Amount raised", "Goal amount", "Donors"],
    ...data.topCampaigns.map((campaign, index) => [
      index + 1,
      campaign.title,
      campaign.category || "Uncategorized",
      campaign.amountRaised,
      campaign.goalAmount,
      campaign.donorCount,
    ]),
  ];

  const topDonorsRows: SheetCell[][] = [
    ["Rank", "Donor", "Username", "Donations", "Total donated"],
    ...data.topDonors.map((donor, index) => [
      index + 1,
      donor.donorName,
      donor.username ?? "",
      donor.donationCount,
      donor.totalDonated,
    ]),
  ];

  const topCreatorsRows: SheetCell[][] = [
    ["Rank", "Creator", "Username", "Causes", "Total raised"],
    ...data.topCreators.map((creator, index) => [
      index + 1,
      creator.creatorName,
      creator.username ?? "",
      creator.campaignCount,
      creator.totalRaised,
    ]),
  ];

  const donationStatusRows: SheetCell[][] = [
    ["Status", "Count", "Total amount"],
    ...data.donationsByStatus.map((entry) => [entry.status, entry.count, entry.total]),
  ];

  const categoriesRows: SheetCell[][] = [
    ["Category", "Causes", "Active causes", "Total raised"],
    ...data.categoryBreakdown.map((entry) => [entry.category, entry.campaignCount, entry.activeCampaigns, entry.totalRaised]),
  ];

  XLSX.utils.book_append_sheet(workbook, createWorkbookSheet(overviewRows, 6), "Overview");
  XLSX.utils.book_append_sheet(workbook, createWorkbookSheet(trendsRows, 0), "Trend data");
  XLSX.utils.book_append_sheet(workbook, createWorkbookSheet(topCausesRows, 0), "Top causes");
  XLSX.utils.book_append_sheet(workbook, createWorkbookSheet(topDonorsRows, 0), "Top donors");
  XLSX.utils.book_append_sheet(workbook, createWorkbookSheet(topCreatorsRows, 0), "Top creators");
  XLSX.utils.book_append_sheet(workbook, createWorkbookSheet(donationStatusRows, 0), "Donation status");
  XLSX.utils.book_append_sheet(workbook, createWorkbookSheet(categoriesRows, 0), "Categories");

  XLSX.writeFile(workbook, `${context.fileBase}.xlsx`, { compression: true });
}

function exportPDF(data: AnalyticsData, periodLabel: string, categoryLabel: string) {
  const context = buildExportContext(data, periodLabel, categoryLabel);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const blue = [37, 99, 235] as [number, number, number];
  const navy = [15, 23, 42] as [number, number, number];
  const slate = [100, 116, 139] as [number, number, number];
  const border = [219, 234, 254] as [number, number, number];
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 42;

  function drawSectionHeading(title: string, subtitle?: string) {
    doc.setFontSize(11);
    doc.setTextColor(...blue);
    doc.text(title, marginX, cursorY);
    cursorY += 16;

    if (subtitle) {
      doc.setFontSize(9);
      doc.setTextColor(...slate);
      doc.text(subtitle, marginX, cursorY);
      cursorY += 14;
    }
  }

  function ensurePageSpace(requiredHeight: number) {
    if (cursorY + requiredHeight <= pageHeight - 36) {
      return;
    }

    doc.addPage();
    cursorY = 34;
  }

  function drawMetricGrid(title: string, subtitle: string, metrics: Array<{ label: string; value: string; note: string }>) {
    ensurePageSpace(150);
    drawSectionHeading(title, subtitle);

    const columns = 3;
    const gap = 12;
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    const cardHeight = 58;
    let localY = cursorY;

    metrics.forEach((metric, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = marginX + column * (cardWidth + gap);
      const y = localY + row * (cardHeight + gap);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...border);
      doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10, "FD");

      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(metric.label.toUpperCase(), x + 12, y + 16);

      doc.setFontSize(16);
      doc.setTextColor(...navy);
      doc.text(metric.value, x + 12, y + 34);

      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(metric.note, x + 12, y + 48);
    });

    cursorY = localY + Math.ceil(metrics.length / columns) * (cardHeight + gap) - gap + 18;
  }

  function drawTable(title: string, subtitle: string, head: string[][], body: Array<Array<string | number>>, columnStyles?: Record<number, { cellWidth?: number }>) {
    const safeBody = body.length ? body : [[ "No data available", ...Array(head[0].length - 1).fill("") ]];

    ensurePageSpace(80);
    drawSectionHeading(title, subtitle);
    autoTable(doc, {
      startY: cursorY,
      head,
      body: safeBody,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      headStyles: {
        fillColor: blue,
        textColor: [255, 255, 255],
        fontSize: 9,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 6,
        lineColor: [226, 232, 240],
        textColor: navy,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles,
    });
    cursorY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }

  doc.setFontSize(18);
  doc.setTextColor(...blue);
  doc.text("Platform Analytics", marginX, 26);
  doc.setFontSize(10);
  doc.setTextColor(...slate);
  doc.text(`Generated ${context.generatedLabel}   |   Date range: ${context.periodLabel}   |   Category: ${context.categoryLabel}`, marginX, 42);
  cursorY = 64;

  drawMetricGrid("Platform summary", "Persistent totals for the current OJC environment.", [
    { label: "Total users", value: formatCount(data.summary.totalUsers), note: "Registered profiles" },
    { label: "Total causes", value: formatCount(data.summary.totalCampaigns), note: "All campaigns" },
    { label: "Total raised", value: formatCurrency(data.summary.totalRaised, true), note: "Completed donations" },
    { label: "Active causes", value: formatCount(data.summary.activeCampaigns), note: "Currently live" },
    { label: "Pending approvals", value: formatCount(data.summary.pendingApprovals), note: "Awaiting review" },
    { label: "Revenue", value: formatCurrency(data.summary.platformRevenue, true), note: "Donation fees, tips, withdrawal fees" },
  ]);

  drawMetricGrid("Selected view", "Filtered totals for the active date range and category.", [
    { label: "Donation volume", value: formatCurrency(context.selectedDonationVolume, true), note: "Completed donation totals" },
    { label: "Revenue", value: formatCurrency(context.selectedRevenue, true), note: "Fee revenue in range" },
    { label: "Tips", value: formatCurrency(context.selectedTipRevenue, true), note: "Completed platform tips" },
    { label: "Withdrawal fees", value: formatCurrency(context.selectedWithdrawalFeeRevenue, true), note: "3% on completed withdrawals" },
    { label: "Completed donations", value: formatCount(context.selectedCompletedDonations), note: "Successful donations" },
    { label: "Users in range", value: formatCount(context.selectedUsers), note: "Profiles created" },
    { label: "Causes in range", value: formatCount(context.selectedCauses), note: "Campaigns created" },
  ]);

  drawTable(
    "Trend breakdown",
    "Period-by-period totals for donations, revenue, users, and causes.",
    [["Period", "Completed donations", "Donation volume", "Revenue", "Users", "Causes"]],
    context.trendRows.map((row) => [
      row.periodKey,
      formatCount(row.completedDonations),
      formatCurrencyExact(row.donationVolume),
      formatCurrencyExact(row.revenue),
      formatCount(row.users),
      formatCount(row.causes),
    ]),
  );

  drawTable(
    "Category distribution",
    "Category mix for the active selection.",
    [["Category", "Causes", "Active causes", "Total raised"]],
    data.categoryBreakdown.map((entry) => [
      entry.category,
      formatCount(entry.campaignCount),
      formatCount(entry.activeCampaigns),
      formatCurrencyExact(entry.totalRaised),
    ]),
  );

  drawTable(
    "Donation status",
    "Donation outcome totals for the current selection.",
    [["Status", "Count", "Total amount"]],
    data.donationsByStatus.map((entry) => [
      entry.status,
      formatCount(entry.count),
      formatCurrencyExact(entry.total),
    ]),
  );

  drawTable(
    "Top causes",
    "Highest-performing causes for the current selection.",
    [["#", "Cause", "Category", "Raised", "Goal", "Donors"]],
    data.topCampaigns.map((campaign, index) => [
      index + 1,
      campaign.title,
      campaign.category || "Uncategorized",
      formatCurrencyExact(campaign.amountRaised),
      formatCurrencyExact(campaign.goalAmount),
      formatCount(campaign.donorCount),
    ]),
    { 0: { cellWidth: 24 } },
  );

  drawTable(
    "Top donors",
    "Donor ranking for the current selection.",
    [["#", "Donor", "Username", "Donations", "Total donated"]],
    data.topDonors.map((donor, index) => [
      index + 1,
      donor.donorName,
      donor.username ?? "-",
      formatCount(donor.donationCount),
      formatCurrencyExact(donor.totalDonated),
    ]),
    { 0: { cellWidth: 24 } },
  );

  drawTable(
    "Top creators",
    "Creator ranking for the current selection.",
    [["#", "Creator", "Username", "Causes", "Total raised"]],
    data.topCreators.map((creator, index) => [
      index + 1,
      creator.creatorName,
      creator.username ?? "-",
      formatCount(creator.campaignCount),
      formatCurrencyExact(creator.totalRaised),
    ]),
    { 0: { cellWidth: 24 } },
  );

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 24, pageWidth - marginX, pageHeight - 24);
    doc.setFontSize(8);
    doc.setTextColor(...slate);
    doc.text(`Platform Analytics Report`, marginX, pageHeight - 10);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - marginX, pageHeight - 10, { align: "right" });
  }

  doc.save(`${context.fileBase}.pdf`);
}

export default function AnalyticsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const VALID_PERIODS: AnalyticsPeriod[] = ["1d", "1w", "2w", "1m", "3m", "6m", "1y", "all", "custom"];
  const urlPeriod = searchParams.get("period") as AnalyticsPeriod | null;
  const urlCustomStart = searchParams.get("customStart") || "";
  const urlCustomEnd = searchParams.get("customEnd") || "";
  const initialCustomRange: AnalyticsCustomRange =
    urlCustomStart && urlCustomEnd
      ? { startDate: urlCustomStart, endDate: urlCustomEnd }
      : DEFAULT_CUSTOM_RANGE;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<AnalyticsPeriod>(
    urlPeriod && VALID_PERIODS.includes(urlPeriod) ? urlPeriod : "1y",
  );
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [customRangeDraft, setCustomRangeDraft] = useState<AnalyticsCustomRange>(initialCustomRange);
  const [customRange, setCustomRange] = useState<AnalyticsCustomRange>(initialCustomRange);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [trendView, setTrendView] = useState<TrendView>(
    (searchParams.get("trend") as TrendView | null) ?? "donation_volume",
  );
  const [rankingView, setRankingView] = useState<RankingView>(
    (searchParams.get("ranking") as RankingView | null) ?? "causes",
  );
  const [categoryRankingMetric, setCategoryRankingMetric] = useState<CategoryRankingMetric>(
    (searchParams.get("catMetric") as CategoryRankingMetric | null) ?? "raised",
  );
  const exportRef = useRef<HTMLDivElement>(null);
  const customRangeRef = useRef<HTMLDivElement>(null);
  const [openCalendar, setOpenCalendar] = useState<CalendarField | null>(null);
  const [calendarMonths, setCalendarMonths] = useState<Record<CalendarField, Date>>({
    start: startOfCalendarMonth(parseCalendarDate(DEFAULT_CUSTOM_RANGE.startDate) ?? new Date()),
    end: startOfCalendarMonth(parseCalendarDate(DEFAULT_CUSTOM_RANGE.endDate) ?? new Date()),
  });
  const customRangeError = period === "custom" ? validateCustomRangeDraft(customRangeDraft) : null;
  const customRangeChanged = customRangeDraft.startDate !== customRange.startDate || customRangeDraft.endDate !== customRange.endDate;

  useEffect(() => {
    const params = new URLSearchParams();
    if (period !== "1y") params.set("period", period);
    if (category) params.set("category", category);
    if (trendView !== "donation_volume") params.set("trend", trendView);
    if (rankingView !== "causes") params.set("ranking", rankingView);
    if (categoryRankingMetric !== "raised") params.set("catMetric", categoryRankingMetric);
    if (period === "custom") {
      params.set("customStart", customRange.startDate);
      params.set("customEnd", customRange.endDate);
    }
    setSearchParams(params, { replace: true });
  }, [period, category, trendView, rankingView, categoryRankingMetric, customRange, setSearchParams]);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportOpen(false);
      }

      if (customRangeRef.current && !customRangeRef.current.contains(event.target as Node)) {
        setOpenCalendar(null);
      }
    }

    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  useEffect(() => {
    if (period !== "custom") {
      setOpenCalendar(null);
    }
  }, [period]);

  useEffect(() => {
    apiBackoffice
      .get<{ categories: Array<{ name: string; isActive: boolean }> }>("/ojc/categories")
      .then((response) => setAvailableCategories(response.data.categories.filter((entry) => entry.isActive).map((entry) => entry.name).sort()))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setData(null);

    const params: Record<string, string> = { period };
    if (period === "custom") {
      params.startDate = customRange.startDate;
      params.endDate = customRange.endDate;
    }
    if (category) {
      params.category = category;
    }

    apiBackoffice
      .get<AnalyticsData>("/ojc/analytics", { params })
      .then((response) => setData(response.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period, category, customRange.endDate, customRange.startDate]);

  const periodLabel = period === "custom"
    ? formatCustomRangeLabel(customRange)
    : PERIOD_OPTIONS.find((entry) => entry.value === period)?.label ?? period;
  const categoryLabel = category || "All categories";
  const selectedDonationVolume = data ? sumTotal(data.donationsByPeriod) : 0;
  const selectedTipRevenue = data ? sumTotal(data.tipRevenueByPeriod ?? []) : 0;
  const selectedWithdrawalFeeRevenue = data ? sumTotal(data.withdrawalFeesByPeriod ?? []) : 0;
  const selectedRevenue = selectedDonationVolume * PLATFORM_FEE + selectedTipRevenue + selectedWithdrawalFeeRevenue;
  const selectedCompletedDonations = data ? sumCount(data.donationsByPeriod) : 0;
  const selectedUsers = data ? sumCount(data.usersByPeriod) : 0;
  const selectedCauses = data ? sumCount(data.campaignsByPeriod) : 0;
  const revenuePoints = data ? buildRevenuePoints(data) : [];
  const revenueLabels = revenuePoints.map((point) => point.key);
  const revenueIncludesPlatformExtras = !category;
  const sortedCategories = data
    ? [...data.categoryBreakdown].sort((left, right) => {
      const difference = categoryMetricValue(right, categoryRankingMetric) - categoryMetricValue(left, categoryRankingMetric);
      return difference !== 0 ? difference : right.totalRaised - left.totalRaised;
    })
    : [];
  const topCategories = sortedCategories.slice(0, 6);
  const totalCategoryMetric = data?.categoryBreakdown.reduce(
    (total, entry) => total + categoryMetricValue(entry, categoryRankingMetric),
    0,
  ) ?? 0;
  const totalDonationStatusCount = data?.donationsByStatus.reduce((total, entry) => total + entry.count, 0) ?? 0;
  const selectedCategoryStats = data && category
    ? data.categoryBreakdown.find((entry) => entry.category === category) ?? null
    : null;
  const categoryRankByRaised = selectedCategoryStats
    ? [...(data?.categoryBreakdown ?? [])]
        .sort((left, right) => right.totalRaised - left.totalRaised)
        .findIndex((entry) => entry.category === selectedCategoryStats.category) + 1
    : null;
  const categoryRankByCauses = selectedCategoryStats
    ? [...(data?.categoryBreakdown ?? [])]
        .sort((left, right) => right.campaignCount - left.campaignCount)
        .findIndex((entry) => entry.category === selectedCategoryStats.category) + 1
    : null;
  const totalCategoryRaised = data?.categoryBreakdown.reduce((total, entry) => total + entry.totalRaised, 0) ?? 0;
  const selectedCategoryRaisedShare = selectedCategoryStats && totalCategoryRaised > 0
    ? (selectedCategoryStats.totalRaised / totalCategoryRaised) * 100
    : 0;
  const peakDonationPoint = data?.donationsByPeriod.reduce<DataPoint | null>(
    (current, point) => ((point.total ?? 0) > (current?.total ?? 0) ? point : current),
    null,
  ) ?? null;
  const peakRevenuePoint = revenuePoints.reduce<DataPoint | null>(
    (current, point) => ((point.total ?? 0) > (current?.total ?? 0) ? point : current),
    null,
  );
  const peakUserPoint = data?.usersByPeriod.reduce<DataPoint | null>(
    (current, point) => (point.count > (current?.count ?? 0) ? point : current),
    null,
  ) ?? null;
  const peakCausePoint = data?.campaignsByPeriod.reduce<DataPoint | null>(
    (current, point) => (point.count > (current?.count ?? 0) ? point : current),
    null,
  ) ?? null;
  const leadingCampaign = data?.topCampaigns[0] ?? null;
  const leadingDonor = data?.topDonors[0] ?? null;
  const leadingCreator = data?.topCreators[0] ?? null;

  function openCalendarFor(field: CalendarField) {
    const selectedDate = parseCalendarDate(field === "start" ? customRangeDraft.startDate : customRangeDraft.endDate) ?? new Date();
    setCalendarMonths((current) => ({
      ...current,
      [field]: startOfCalendarMonth(selectedDate),
    }));
    setOpenCalendar(field);
  }

  function shiftCalendarMonth(field: CalendarField, delta: number) {
    setCalendarMonths((current) => ({
      ...current,
      [field]: addCalendarMonths(current[field], delta),
    }));
  }

  function handleDraftDateSelect(field: CalendarField, nextValue: string) {
    setCustomRangeDraft((current) => {
      if (field === "start") {
        const nextEndDate = current.endDate < nextValue ? nextValue : current.endDate;
        return {
          startDate: nextValue,
          endDate: nextEndDate,
        };
      }

      if (nextValue < current.startDate) {
        return current;
      }

      return {
        ...current,
        endDate: nextValue,
      };
    });
    setCalendarMonths((current) => ({
      ...current,
      [field]: startOfCalendarMonth(parseCalendarDate(nextValue) ?? current[field]),
    }));
    setOpenCalendar(null);
  }

  return (
    <div className="analytics-page">
      <div className="admin-page-header analytics-page__header">
        <h1>Analytics</h1>
        <p>Platform performance, fundraising trends, and ranking views.</p>
      </div>

      {loading ? (
        <section className="analytics-empty-state"><i className="bi bi-bar-chart-line" /><p>Loading analytics...</p></section>
      ) : !data ? (
        <section className="analytics-empty-state analytics-empty-state--error"><i className="bi bi-exclamation-circle" /><p>Failed to load analytics.</p></section>
      ) : (
        <>
          <section className="analytics-section">
            <div className="analytics-section__heading">
              <div className="analytics-section__heading-copy">
                <span className="analytics-section__scope analytics-section__scope--global">Platform-wide</span>
                <h2>Platform metrics</h2>
                <p>Persistent totals for the current OJC environment.</p>
              </div>
            </div>
            <div className="analytics-summary-grid">
              <SummaryCard label="Total users" value={formatCount(data.summary.totalUsers)} note="Registered profiles" accent="#2563eb" />
              <SummaryCard label="Total causes" value={formatCount(data.summary.totalCampaigns)} note="All campaigns" accent="#0f766e" />
              <SummaryCard label="Total raised" value={formatCurrency(data.summary.totalRaised, true)} note="Completed donations" accent="#0284c7" />
              <SummaryCard label="Active causes" value={formatCount(data.summary.activeCampaigns)} note="Currently live" accent="#16a34a" />
              <SummaryCard label="Pending approvals" value={formatCount(data.summary.pendingApprovals)} note="Awaiting review" accent="#d97706" />
              <SummaryCard label="New users (30 days)" value={formatCount(data.summary.newUsers30d)} note="Recent registrations" accent="#7c3aed" />
              <SummaryCard label="Revenue" value={formatCurrency(data.summary.platformRevenue, true)} note="Donation fees, tips, withdrawal fees" accent="#dc2626" />
            </div>
          </section>

          <section className="analytics-toolbar">
            <div className="analytics-toolbar__block">
              <span className="analytics-toolbar__label">Date range</span>
              <div className="analytics-period-chips" role="tablist" aria-label="Analytics period">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`analytics-period-chip${period === option.value ? " analytics-period-chip--active" : ""}`}
                    onClick={() => setPeriod(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {period === "custom" ? (
                <div className="analytics-custom-range" ref={customRangeRef}>
                  <RangeCalendarField
                    label="Start date"
                    field="start"
                    value={customRangeDraft.startDate}
                    counterpartValue={customRangeDraft.endDate}
                    rangeStart={customRangeDraft.startDate}
                    rangeEnd={customRangeDraft.endDate}
                    open={openCalendar === "start"}
                    visibleMonth={calendarMonths.start}
                    onOpen={() => openCalendarFor("start")}
                    onMonthChange={(delta) => shiftCalendarMonth("start", delta)}
                    onSelect={(nextValue) => handleDraftDateSelect("start", nextValue)}
                  />

                  <RangeCalendarField
                    label="End date"
                    field="end"
                    value={customRangeDraft.endDate}
                    counterpartValue={customRangeDraft.startDate}
                    rangeStart={customRangeDraft.startDate}
                    rangeEnd={customRangeDraft.endDate}
                    open={openCalendar === "end"}
                    visibleMonth={calendarMonths.end}
                    minValue={customRangeDraft.startDate}
                    onOpen={() => openCalendarFor("end")}
                    onMonthChange={(delta) => shiftCalendarMonth("end", delta)}
                    onSelect={(nextValue) => handleDraftDateSelect("end", nextValue)}
                  />

                  <button
                    type="button"
                    className="analytics-custom-range__apply"
                    onClick={() => setCustomRange(customRangeDraft)}
                    disabled={!customRangeChanged || Boolean(customRangeError)}
                  >
                    Apply range
                  </button>

                  {customRangeError ? <p className="analytics-custom-range__error">{customRangeError}</p> : null}
                </div>
              ) : null}
            </div>

            <div className="analytics-toolbar__controls">
              <label className="analytics-select">
                <span>Category</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">All categories</option>
                  {availableCategories.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                </select>
              </label>

              <div className="analytics-export" ref={exportRef}>
                <button type="button" className="analytics-export__trigger" onClick={() => setExportOpen((value) => !value)}>
                  <i className="bi bi-download" />
                  Export data
                  <i className="bi bi-chevron-down" />
                </button>
                {exportOpen ? (
                  <div className="analytics-export__menu">
                    <button type="button" onClick={() => { exportWorkbook(data, periodLabel, categoryLabel); setExportOpen(false); }}>
                      <i className="bi bi-file-earmark-spreadsheet" />
                      Excel workbook
                    </button>
                    <button type="button" onClick={() => { exportPDF(data, periodLabel, categoryLabel); setExportOpen(false); }}>
                      <i className="bi bi-filetype-pdf" />
                      PDF report
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="analytics-view-card">
            <div className="analytics-view-card__copy">
              <span className="analytics-view-card__eyebrow">Filtered by selection</span>
              <h2>Performance overview</h2>
              <p>{periodLabel} · {categoryLabel}</p>
              <small>All sections below reflect the current date range and category.</small>
            </div>

            <dl className="analytics-view-card__stats">
              <div><dt>Donation volume</dt><dd>{formatCurrency(selectedDonationVolume, true)}</dd></div>
              <div><dt>Revenue</dt><dd>{formatCurrency(selectedRevenue, true)}</dd></div>
              {revenueIncludesPlatformExtras ? (
                <div><dt>Tips</dt><dd>{formatCurrency(selectedTipRevenue, true)}</dd></div>
              ) : null}
              {revenueIncludesPlatformExtras ? (
                <div><dt>Withdrawal fees</dt><dd>{formatCurrency(selectedWithdrawalFeeRevenue, true)}</dd></div>
              ) : null}
              <div><dt>Completed donations</dt><dd>{formatCount(selectedCompletedDonations)}</dd></div>
              <div><dt>Users in range</dt><dd>{formatCount(selectedUsers)}</dd></div>
              <div><dt>Causes in range</dt><dd>{formatCount(selectedCauses)}</dd></div>
            </dl>
          </section>

          <section className="analytics-section">
            <div className="analytics-section__heading">
              <div className="analytics-section__heading-copy">
                <span className="analytics-section__scope analytics-section__scope--filtered">Filtered by selection</span>
                <h2>Trend analysis</h2>
                <p>Performance trends for the selected range and category.</p>
              </div>
              <div className="analytics-section__meta">
                <span>{formatCount(selectedCompletedDonations)} completed donations</span>
                <span>{formatCount(selectedUsers)} users</span>
                <span>{formatCount(selectedCauses)} causes</span>
              </div>
            </div>
            <article className="analytics-panel">
              <div className="analytics-panel__header analytics-panel__header--stacked">
                <div>
                  <span className="analytics-panel__eyebrow">Filtered charts</span>
                  <h3>
                    {trendView === "donation_volume"
                      ? "Donation volume over time"
                      : trendView === "revenue"
                        ? "Revenue over time"
                      : trendView === "users"
                        ? "Users over time"
                        : "Causes over time"}
                  </h3>
                  <p className="analytics-panel__description">
                    {trendView === "donation_volume"
                      ? "Completed donation totals recorded in each period of the selected range."
                      : trendView === "revenue"
                        ? revenueIncludesPlatformExtras
                          ? "Platform revenue generated in each period from donation fees, tips, and withdrawal fees."
                          : "Platform fee revenue generated in each period, based on completed donations for the selected category."
                        : trendView === "users"
                          ? "New user profiles created in each period of the selected range."
                          : "New causes created in each period of the selected range."}
                  </p>
                </div>
                <div className="analytics-ranking-tabs" role="tablist" aria-label="Trend view">
                  {TREND_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={trendView === option.value}
                      className={`analytics-ranking-tab${trendView === option.value ? " analytics-ranking-tab--active" : ""}`}
                      onClick={() => setTrendView(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="analytics-ranking-highlights analytics-ranking-highlights--trend">
                {trendView === "donation_volume" ? (
                  <>
                    <div>
                      <label>Total volume</label>
                      <strong>{formatCurrency(selectedDonationVolume)}</strong>
                    </div>
                    <div>
                      <label>Completed donations</label>
                      <strong>{formatCount(selectedCompletedDonations)}</strong>
                    </div>
                    <div>
                      <label>Peak period</label>
                      <strong>
                        {peakDonationPoint
                          ? `${formatCurrency(peakDonationPoint.total ?? 0)} - ${formatAxisKey(peakDonationPoint.key, data.period, data.bucketTrunc)}`
                          : "No data"}
                      </strong>
                    </div>
                  </>
                ) : trendView === "revenue" ? (
                  <>
                    <div>
                      <label>Total revenue</label>
                      <strong>{formatCurrency(selectedRevenue)}</strong>
                    </div>
                    <div>
                      <label>Fee rate</label>
                      <strong>{revenueIncludesPlatformExtras ? "7% donations / tips / 3% withdrawals" : "7% donations"}</strong>
                    </div>
                    <div>
                      <label>Peak period</label>
                      <strong>
                        {peakRevenuePoint
                          ? `${formatCurrency(peakRevenuePoint.total ?? 0)} - ${formatAxisKey(peakRevenuePoint.key, data.period, data.bucketTrunc)}`
                          : "No data"}
                      </strong>
                    </div>
                  </>
                ) : trendView === "users" ? (
                  <>
                    <div>
                      <label>Users in range</label>
                      <strong>{formatCount(selectedUsers)}</strong>
                    </div>
                    <div>
                      <label>Peak count</label>
                      <strong>{formatCount(peakUserPoint?.count ?? 0)}</strong>
                    </div>
                    <div>
                      <label>Peak period</label>
                      <strong>{peakUserPoint ? formatAxisKey(peakUserPoint.key, data.period, data.bucketTrunc) : "No data"}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label>Causes in range</label>
                      <strong>{formatCount(selectedCauses)}</strong>
                    </div>
                    <div>
                      <label>Peak count</label>
                      <strong>{formatCount(peakCausePoint?.count ?? 0)}</strong>
                    </div>
                    <div>
                      <label>Peak period</label>
                      <strong>{peakCausePoint ? formatAxisKey(peakCausePoint.key, data.period, data.bucketTrunc) : "No data"}</strong>
                    </div>
                  </>
                )}
              </div>

              {trendView === "donation_volume" ? (
                data.donationsByPeriod.length === 0 ? (
                  <div className="analytics-panel__empty">No donation data for this selection.</div>
                ) : (
                  <TrendChart
                    labels={data.donationsByPeriod.map((point) => point.key)}
                    period={data.period}
                    bucketTrunc={data.bucketTrunc}
                    leftFormatter={(value) => formatCurrency(value, true)}
                    leftAxisMode="currency"
                    series={[
                      { label: "Donation volume", color: "#2563eb", values: data.donationsByPeriod.map((point) => point.total ?? 0), fill: true },
                    ]}
                  />
                )
              ) : trendView === "revenue" ? (
                revenuePoints.length === 0 ? (
                  <div className="analytics-panel__empty">No revenue data for this selection.</div>
                ) : (
                  <TrendChart
                    labels={revenueLabels}
                    period={data.period}
                    bucketTrunc={data.bucketTrunc}
                    leftFormatter={(value) => formatCurrency(value, true)}
                    leftAxisMode="currency"
                    series={[
                      { label: "Revenue", color: "#14b8a6", values: revenuePoints.map((point) => point.total ?? 0), fill: true },
                    ]}
                  />
                )
              ) : trendView === "users" ? (
                data.usersByPeriod.length === 0 ? (
                  <div className="analytics-panel__empty">No user data for this selection.</div>
                ) : (
                  <TrendChart
                    labels={data.usersByPeriod.map((point) => point.key)}
                    period={data.period}
                    bucketTrunc={data.bucketTrunc}
                    leftFormatter={formatCountCompact}
                    leftAxisMode="count"
                    series={[{ label: "Users", color: "#7c3aed", values: data.usersByPeriod.map((point) => point.count), fill: true }]}
                  />
                )
              ) : data.campaignsByPeriod.length === 0 ? (
                <div className="analytics-panel__empty">No cause data for this selection.</div>
              ) : (
                <TrendChart
                  labels={data.campaignsByPeriod.map((point) => point.key)}
                  period={data.period}
                  bucketTrunc={data.bucketTrunc}
                  leftFormatter={formatCountCompact}
                  leftAxisMode="count"
                  series={[{ label: "Causes", color: "#0f766e", values: data.campaignsByPeriod.map((point) => point.count), fill: true }]}
                />
              )}
            </article>
          </section>

          <section className="analytics-section">
            <div className="analytics-section__heading">
              <div className="analytics-section__heading-copy">
                <span className="analytics-section__scope analytics-section__scope--filtered">Filtered by selection</span>
                <h2>Distribution</h2>
                <p>Category mix and donation outcome breakdown for the same filtered view.</p>
              </div>
            </div>
            <div className="analytics-distribution-grid">
              <article className="analytics-panel analytics-panel--wide">
                <div className="analytics-panel__header">
                  <div>
                    <span className="analytics-panel__eyebrow">Categories</span>
                    <h3>{category ? "Selected category" : categoryMetricHeading(categoryRankingMetric)}</h3>
                  </div>
                  {!category ? (
                    <label className="analytics-panel__control">
                      <span>Order by</span>
                      <select value={categoryRankingMetric} onChange={(event) => setCategoryRankingMetric(event.target.value as CategoryRankingMetric)}>
                        {CATEGORY_RANKING_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                {category ? (
                  selectedCategoryStats ? (
                    <div className="analytics-category-focus">
                      <div className="analytics-category-focus__hero">
                        <div>
                          <strong>{selectedCategoryStats.category}</strong>
                          <p>Performance for the selected category within the chosen date range.</p>
                        </div>
                        <span>{formatCurrency(selectedCategoryStats.totalRaised)}</span>
                      </div>

                      <div className="analytics-category-focus__grid">
                        <div>
                          <label>Total raised</label>
                          <strong>{formatCurrency(selectedCategoryStats.totalRaised, true)}</strong>
                        </div>
                        <div>
                          <label>Causes in range</label>
                          <strong>{formatCount(selectedCategoryStats.campaignCount)}</strong>
                        </div>
                        <div>
                          <label>Active causes</label>
                          <strong>{formatCount(selectedCategoryStats.activeCampaigns)}</strong>
                        </div>
                        <div>
                          <label>Revenue</label>
                          <strong>{formatCurrency(selectedCategoryStats.totalRaised * PLATFORM_FEE, true)}</strong>
                        </div>
                      </div>

                      <div className="analytics-category-focus__meta">
                        <span>Raised share: {selectedCategoryRaisedShare.toFixed(0)}%</span>
                        {categoryRankByRaised ? <span>Raised rank: #{categoryRankByRaised}</span> : null}
                        {categoryRankByCauses ? <span>Cause rank: #{categoryRankByCauses}</span> : null}
                      </div>
                    </div>
                  ) : (
                    <div className="analytics-panel__empty">No performance data for this category in the selected range.</div>
                  )
                ) : topCategories.length === 0 ? (
                  <div className="analytics-panel__empty">No category data for this selection.</div>
                ) : (
                  <div className="analytics-category-list">
                    {topCategories.map((entry) => {
                      const metricValue = categoryMetricValue(entry, categoryRankingMetric);
                      const metricShare = totalCategoryMetric > 0 ? (metricValue / totalCategoryMetric) * 100 : 0;

                      return (
                        <div key={entry.category} className="analytics-category-list__item">
                        <div className="analytics-category-list__top">
                          <strong>{entry.category}</strong>
                          <span>{formatCategoryMetricValue(entry, categoryRankingMetric)}</span>
                        </div>
                        <div className="analytics-category-list__bar">
                          <div style={{ width: `${metricShare}%` }} />
                        </div>
                        <div className="analytics-category-list__meta">
                          <span>{formatPercentage(metricShare)}% of {categoryMetricShareLabel(categoryRankingMetric)}</span>
                        </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="analytics-panel">
                <div className="analytics-panel__header">
                  <div><span className="analytics-panel__eyebrow">Payments</span><h3>Donations by status</h3></div>
                </div>
                {data.donationsByStatus.length === 0 ? (
                  <div className="analytics-panel__empty">No donation status data for this selection.</div>
                ) : (
                  <>
                    <div className="analytics-status-bar" aria-label="Donation status distribution">
                      {data.donationsByStatus.map((entry) => (
                        <div
                          key={`${entry.status}-segment`}
                          className={`analytics-status-bar__segment analytics-status-bar__segment--${entry.status.toLowerCase()}`}
                          style={{ width: `${Math.max(8, (entry.count / Math.max(totalDonationStatusCount, 1)) * 100)}%` }}
                          title={`${entry.status}: ${formatCount(entry.count)} (${((entry.count / Math.max(totalDonationStatusCount, 1)) * 100).toFixed(0)}%)`}
                        />
                      ))}
                    </div>
                    <div className="analytics-status-list">
                      {data.donationsByStatus.map((entry) => (
                        <div key={entry.status} className="analytics-status-list__item">
                          <div>
                            <span className={`analytics-status-list__badge analytics-status-list__badge--${entry.status.toLowerCase()}`}>{entry.status}</span>
                            <p>{formatCurrency(entry.total)} · {((entry.count / Math.max(totalDonationStatusCount, 1)) * 100).toFixed(0)}%</p>
                          </div>
                          <strong>{formatCount(entry.count)}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>
            </div>
          </section>

          <section className="analytics-section">
            <div className="analytics-section__heading">
              <div className="analytics-section__heading-copy">
                <span className="analytics-section__scope analytics-section__scope--filtered">Filtered by selection</span>
                <h2>Rankings</h2>
                <p>Top causes, donors, and creators based on the selected filters.</p>
              </div>
            </div>
            <article className="analytics-panel">
              <div className="analytics-panel__header analytics-panel__header--stacked">
                <div>
                  <span className="analytics-panel__eyebrow">Filtered leaderboard</span>
                  <h3>
                    {rankingView === "causes"
                      ? "Top causes"
                      : rankingView === "donors"
                        ? "Top donors"
                        : "Top creators"}
                  </h3>
                </div>
                <div className="analytics-ranking-tabs" role="tablist" aria-label="Ranking view">
                  {RANKING_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={rankingView === option.value}
                      className={`analytics-ranking-tab${rankingView === option.value ? " analytics-ranking-tab--active" : ""}`}
                      onClick={() => setRankingView(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="analytics-ranking-highlights">
                <div>
                  <label>Leading entry</label>
                  <strong>
                    {rankingView === "causes"
                      ? leadingCampaign?.title ?? "No data"
                      : rankingView === "donors"
                        ? leadingDonor?.donorName ?? "No data"
                        : leadingCreator?.creatorName ?? "No data"}
                  </strong>
                </div>
                <div>
                  <label>Primary metric</label>
                  <strong>
                    {rankingView === "causes"
                      ? formatCurrency(leadingCampaign?.amountRaised ?? 0)
                      : rankingView === "donors"
                        ? formatCurrency(leadingDonor?.totalDonated ?? 0)
                        : formatCurrency(leadingCreator?.totalRaised ?? 0)}
                  </strong>
                </div>
                <div>
                  <label>Entries shown</label>
                  <strong>
                    {rankingView === "causes"
                      ? formatCount(data.topCampaigns.length)
                      : rankingView === "donors"
                        ? formatCount(data.topDonors.length)
                        : formatCount(data.topCreators.length)}
                  </strong>
                </div>
              </div>

              {rankingView === "causes" ? (
                data.topCampaigns.length === 0 ? (
                  <div className="analytics-panel__empty">No cause rankings for this selection.</div>
                ) : (
                  <div className="analytics-table-wrap">
                    <table className="analytics-table analytics-table--wide">
                      <thead>
                        <tr><th>#</th><th>Cause</th><th>Category</th><th>Raised</th><th>Goal</th><th>Progress</th><th>Donors</th></tr>
                      </thead>
                      <tbody>
                        {data.topCampaigns.map((campaign, index) => {
                          const progress = campaign.goalAmount > 0 ? Math.min(100, (campaign.amountRaised / campaign.goalAmount) * 100) : 0;
                          return (
                            <tr key={campaign.campaignId}>
                              <td className="analytics-table__rank">{index + 1}</td>
                              <td><div className="analytics-table__primary">{campaign.title}</div></td>
                              <td><span className="analytics-table__tag">{campaign.category || "Uncategorized"}</span></td>
                              <td>{formatCurrency(campaign.amountRaised)}</td>
                              <td>{formatCurrency(campaign.goalAmount)}</td>
                              <td>
                                <div className="analytics-progress">
                                  <div className="analytics-progress__track"><div className="analytics-progress__fill" style={{ width: `${Math.max(progress, 6)}%` }} /></div>
                                  <span>{progress.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td>{formatCount(campaign.donorCount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : rankingView === "donors" ? (
                data.topDonors.length === 0 ? (
                  <div className="analytics-panel__empty">No donor rankings for this selection.</div>
                ) : (
                  <div className="analytics-table-wrap">
                    <table className="analytics-table">
                      <thead>
                        <tr><th>#</th><th>Donor</th><th>Donations</th><th>Total</th></tr>
                      </thead>
                      <tbody>
                        {data.topDonors.map((donor, index) => (
                          <tr key={donor.profileId ?? `${donor.donorName}-${index}`}>
                            <td className="analytics-table__rank">{index + 1}</td>
                            <td>
                              <div className="analytics-table__primary">{donor.donorName}</div>
                              {donor.username && donor.donorName !== "Anonymous" ? <div className="analytics-table__secondary">@{donor.username}</div> : null}
                            </td>
                            <td>{formatCount(donor.donationCount)}</td>
                            <td>{formatCurrency(donor.totalDonated)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : data.topCreators.length === 0 ? (
                <div className="analytics-panel__empty">No creator rankings for this selection.</div>
              ) : (
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr><th>#</th><th>Creator</th><th>Causes</th><th>Raised</th></tr>
                    </thead>
                    <tbody>
                      {data.topCreators.map((creator, index) => (
                        <tr key={creator.profileId}>
                          <td className="analytics-table__rank">{index + 1}</td>
                          <td>
                            <div className="analytics-table__primary">{creator.creatorName}</div>
                            {creator.username ? <div className="analytics-table__secondary">@{creator.username}</div> : null}
                          </td>
                          <td>{formatCount(creator.campaignCount)}</td>
                          <td>{formatCurrency(creator.totalRaised)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
