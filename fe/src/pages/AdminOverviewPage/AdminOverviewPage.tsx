import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { apiBackoffice } from "@/shared/lib/axios";
import "./adminOverview.css";

interface OverviewSnapshot {
  totalUsers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalRaised: number;
  completedDonations: number;
}

interface OverviewCampaignStats {
  total: number;
  pending: number;
  active: number;
  reviewing: number;
  inactive: number;
  finished: number;
  rejected: number;
}

interface OverviewCampaignRevisionStats {
  pending: number;
  changesRequested: number;
  approved: number;
  rejected: number;
}

interface OverviewReportStats {
  open: number;
  inReview: number;
  resolved: number;
  dismissed: number;
}

interface OverviewCategoryStats {
  total: number;
  active: number;
  inactive: number;
  usedByCampaigns: number;
}

interface OverviewUserStats {
  total: number;
  creators: number;
  donors: number;
  withStrikes: number;
  atSuspensionThreshold: number;
}

interface OverviewOrganizationStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  activeCampaigns: number;
}

interface OverviewDonationStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  completedAmount: number;
}

interface OverviewKycStats {
  pending: number;
  verified: number;
  declined: number;
}

interface OverviewWithdrawalStats {
  pending: number;
  completed: number;
  failed: number;
}

interface OverviewDepositStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  totalAmountFiat: number;
}

interface OverviewTransactionStats {
  total: number;
  donationCount: number;
  tipCount: number;
  withdrawalCount: number;
  transferCount: number;
  totalMoved: number;
}

interface OverviewAnalyticsStats {
  totalRaised: number;
  revenue: number;
  newUsers30d: number;
  biggestDonorName: string | null;
  biggestDonorAmount: number;
}

interface OverviewAuditLogStats {
  total: number;
  last24Hours: number;
  moderationActions: number;
  uniqueAdmins: number;
}

interface OverviewStats {
  snapshot: OverviewSnapshot;
  campaigns: OverviewCampaignStats;
  campaignRevisions: OverviewCampaignRevisionStats;
  reports: OverviewReportStats;
  categories: OverviewCategoryStats;
  users: OverviewUserStats;
  organizations: OverviewOrganizationStats;
  donations: OverviewDonationStats;
  kyc: OverviewKycStats;
  deposits: OverviewDepositStats;
  transactions: OverviewTransactionStats;
  withdrawals: OverviewWithdrawalStats;
  analytics: OverviewAnalyticsStats;
  auditLogs: OverviewAuditLogStats;
}

interface ModuleCard {
  key: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  softBg: string;
  stats: Array<{ label: string; value: string }>;
}

function formatCount(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString();
}

function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value && value >= 1000 ? 0 : 2,
  }).format(Number(value ?? 0));
}

const EMPTY_OVERVIEW_STATS: OverviewStats = {
  snapshot: {
    totalUsers: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalRaised: 0,
    completedDonations: 0,
  },
  campaigns: {
    total: 0,
    pending: 0,
    active: 0,
    reviewing: 0,
    inactive: 0,
    finished: 0,
    rejected: 0,
  },
  campaignRevisions: {
    pending: 0,
    changesRequested: 0,
    approved: 0,
    rejected: 0,
  },
  reports: {
    open: 0,
    inReview: 0,
    resolved: 0,
    dismissed: 0,
  },
  categories: {
    total: 0,
    active: 0,
    inactive: 0,
    usedByCampaigns: 0,
  },
  users: {
    total: 0,
    creators: 0,
    donors: 0,
    withStrikes: 0,
    atSuspensionThreshold: 0,
  },
  organizations: {
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    activeCampaigns: 0,
  },
  donations: {
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    completedAmount: 0,
  },
  kyc: {
    pending: 0,
    verified: 0,
    declined: 0,
  },
  deposits: {
    total: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    totalAmountFiat: 0,
  },
  transactions: {
    total: 0,
    donationCount: 0,
    tipCount: 0,
    withdrawalCount: 0,
    transferCount: 0,
    totalMoved: 0,
  },
  withdrawals: {
    pending: 0,
    completed: 0,
    failed: 0,
  },
  analytics: {
    totalRaised: 0,
    revenue: 0,
    newUsers30d: 0,
    biggestDonorName: null,
    biggestDonorAmount: 0,
  },
  auditLogs: {
    total: 0,
    last24Hours: 0,
    moderationActions: 0,
    uniqueAdmins: 0,
  },
};

function normalizeOverviewStats(raw: Partial<OverviewStats> | null | undefined): OverviewStats {
  return {
    snapshot: { ...EMPTY_OVERVIEW_STATS.snapshot, ...raw?.snapshot },
    campaigns: { ...EMPTY_OVERVIEW_STATS.campaigns, ...raw?.campaigns },
    campaignRevisions: { ...EMPTY_OVERVIEW_STATS.campaignRevisions, ...raw?.campaignRevisions },
    reports: { ...EMPTY_OVERVIEW_STATS.reports, ...raw?.reports },
    categories: { ...EMPTY_OVERVIEW_STATS.categories, ...raw?.categories },
    users: { ...EMPTY_OVERVIEW_STATS.users, ...raw?.users },
    organizations: { ...EMPTY_OVERVIEW_STATS.organizations, ...raw?.organizations },
    donations: { ...EMPTY_OVERVIEW_STATS.donations, ...raw?.donations },
    kyc: { ...EMPTY_OVERVIEW_STATS.kyc, ...raw?.kyc },
    deposits: { ...EMPTY_OVERVIEW_STATS.deposits, ...raw?.deposits },
    transactions: { ...EMPTY_OVERVIEW_STATS.transactions, ...raw?.transactions },
    withdrawals: { ...EMPTY_OVERVIEW_STATS.withdrawals, ...raw?.withdrawals },
    analytics: { ...EMPTY_OVERVIEW_STATS.analytics, ...raw?.analytics },
    auditLogs: { ...EMPTY_OVERVIEW_STATS.auditLogs, ...raw?.auditLogs },
  };
}

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiBackoffice
      .get<Partial<OverviewStats>>("/ojc/overview/stats")
      .then((response) => setStats(normalizeOverviewStats(response.data)))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const isSuperAdmin = user?.role === "Super Admin";

  const hasAnyPermission = useMemo(
    () => (permissions: string[]) => isSuperAdmin || permissions.some((permission) => permissionSet.has(permission)),
    [isSuperAdmin, permissionSet],
  );

  const moduleCards = (() => {
    if (!stats) return [] as ModuleCard[];

    const cards: ModuleCard[] = [];

    if (hasAnyPermission(["view_campaigns", "approve_reject"])) {
      cards.push({
        key: "campaigns",
        title: "Campaigns",
        description: "Publication and review states across the live cause catalog.",
        icon: "bi-megaphone",
        accent: "#2563eb",
        softBg: "#eff6ff",
        stats: [
          { label: "Total campaigns", value: formatCount(stats.campaigns.total) },
          { label: "Pending approval", value: formatCount(stats.campaigns.pending) },
          { label: "Active", value: formatCount(stats.campaigns.active) },
          { label: "Reviewing", value: formatCount(stats.campaigns.reviewing) },
        ],
      });
    }

    if (hasAnyPermission(["approve_reject", "respond", "flag_escalate", "block_suspend"])) {
      cards.push({
        key: "campaign-revisions",
        title: "Campaign Revisions",
        description: "Pending and completed campaign revision review threads.",
        icon: "bi-arrow-repeat",
        accent: "#4f46e5",
        softBg: "#eef2ff",
        stats: [
          { label: "Pending", value: formatCount(stats.campaignRevisions?.pending) },
          { label: "Changes requested", value: formatCount(stats.campaignRevisions?.changesRequested) },
          { label: "Approved", value: formatCount(stats.campaignRevisions?.approved) },
          { label: "Rejected", value: formatCount(stats.campaignRevisions?.rejected) },
        ],
      });
    }

    if (hasAnyPermission(["view_reports", "respond", "flag_escalate"])) {
      cards.push({
        key: "reports",
        title: "Reports",
        description: "Current moderation case status split for incoming abuse reports.",
        icon: "bi-flag",
        accent: "#dc2626",
        softBg: "#fef2f2",
        stats: [
          { label: "Open", value: formatCount(stats.reports.open) },
          { label: "In review", value: formatCount(stats.reports.inReview) },
          { label: "Resolved", value: formatCount(stats.reports.resolved) },
          { label: "Dismissed", value: formatCount(stats.reports.dismissed) },
        ],
      });
    }

    if (hasAnyPermission(["view_categories", "edit_categories"])) {
      cards.push({
        key: "categories",
        title: "Categories",
        description: "Campaign taxonomy availability and usage across the catalog.",
        icon: "bi-tags",
        accent: "#0d9488",
        softBg: "#ccfbf1",
        stats: [
          { label: "Total categories", value: formatCount(stats.categories?.total) },
          { label: "Active", value: formatCount(stats.categories?.active) },
          { label: "Inactive", value: formatCount(stats.categories?.inactive) },
          { label: "Used by campaigns", value: formatCount(stats.categories?.usedByCampaigns) },
        ],
      });
    }

    if (hasAnyPermission(["view_users", "block_suspend"])) {
      cards.push({
        key: "users",
        title: "Users",
        description: "Account population and current strike exposure across profiles.",
        icon: "bi-people",
        accent: "#7c3aed",
        softBg: "#eff6ff",
        stats: [
          { label: "Total profiles", value: formatCount(stats.users.total) },
          { label: "Creators", value: formatCount(stats.users.creators) },
          { label: "Donors", value: formatCount(stats.users.donors) },
          { label: "With strikes", value: formatCount(stats.users.withStrikes) },
        ],
      });
    }

    if (hasAnyPermission(["view_organizations", "view_kyb"])) {
      cards.push({
        key: "organizations",
        title: "Organizations",
        description: "Business profiles and KYB status across organization accounts.",
        icon: "bi-buildings",
        accent: "#9333ea",
        softBg: "#faf5ff",
        stats: [
          { label: "Organizations", value: formatCount(stats.organizations?.total) },
          { label: "Verified KYB", value: formatCount(stats.organizations?.verified) },
          { label: "Pending KYB", value: formatCount(stats.organizations?.pending) },
          { label: "Active campaigns", value: formatCount(stats.organizations?.activeCampaigns) },
        ],
      });
    }

    if (hasAnyPermission(["view_donations", "export"])) {
      cards.push({
        key: "donations",
        title: "Donations",
        description: "Operational donation totals and payment outcomes without analytics depth.",
        icon: "bi-heart",
        accent: "#0891b2",
        softBg: "#ecfeff",
        stats: [
          { label: "Total donations", value: formatCount(stats.donations.total) },
          { label: "Completed", value: formatCount(stats.donations.completed) },
          { label: "Pending", value: formatCount(stats.donations.pending) },
          { label: "Failed", value: formatCount(stats.donations.failed) },
        ],
      });
    }

    if (hasAnyPermission(["export", "view_campaigns", "view_users"])) {
      cards.push({
        key: "analytics",
        title: "Analytics",
        description: "High-level performance signals surfaced from platform-wide totals.",
        icon: "bi-graph-up-arrow",
        accent: "#f59e0b",
        softBg: "#fffbeb",
        stats: [
          { label: "Total raised", value: formatCurrency(stats.analytics?.totalRaised) },
          { label: "Revenue", value: formatCurrency(stats.analytics?.revenue) },
          { label: "New users (30 days)", value: formatCount(stats.analytics?.newUsers30d) },
          {
            label: "Biggest donor",
            value: stats.analytics?.biggestDonorName
              ? `${stats.analytics.biggestDonorName} · ${formatCurrency(stats.analytics.biggestDonorAmount)}`
              : "No donor yet",
          },
        ],
      });
    }

    if (hasAnyPermission(["view_donations", "view_deposits", "export"])) {
      cards.push({
        key: "transactions",
        title: "Transactions",
        description: "Shared ledger movement totals grouped by transaction purpose.",
        icon: "bi-credit-card",
        accent: "#475569",
        softBg: "#f1f5f9",
        stats: [
          { label: "Total transactions", value: formatCount(stats.transactions?.total) },
          { label: "Donations", value: formatCount(stats.transactions?.donationCount) },
          { label: "Tips", value: formatCount(stats.transactions?.tipCount) },
          { label: "Completed moved", value: formatCurrency(stats.transactions?.totalMoved) },
        ],
      });
    }

    if (hasAnyPermission(["view_deposits", "export"])) {
      cards.push({
        key: "deposits",
        title: "Deposits",
        description: "Account funding totals and deposit outcomes from the shared finance system.",
        icon: "bi-arrow-down-circle",
        accent: "#2563eb",
        softBg: "#eff6ff",
        stats: [
          { label: "Total deposits", value: formatCount(stats.deposits.total) },
          { label: "Completed", value: formatCount(stats.deposits.completed) },
          { label: "Pending", value: formatCount(stats.deposits.pending) },
          { label: "Completed deposited", value: formatCurrency(stats.deposits.totalAmountFiat) },
        ],
      });
    }

    if (hasAnyPermission(["view_kyc"])) {
      cards.push({
        key: "kyc",
        title: "KYC",
        description: "Identity verification queue totals from the compliance workflow.",
        icon: "bi-person-check",
        accent: "#0f766e",
        softBg: "#ecfdf5",
        stats: [
          { label: "Pending", value: formatCount(stats.kyc.pending) },
          { label: "Verified", value: formatCount(stats.kyc.verified) },
          { label: "Declined", value: formatCount(stats.kyc.declined) },
          { label: "Total checks", value: formatCount(stats.kyc.pending + stats.kyc.verified + stats.kyc.declined) },
        ],
      });
    }

    if (hasAnyPermission(["view_withdrawals", "process_withdrawals"])) {
      cards.push({
        key: "withdrawals",
        title: "Withdrawals",
        description: "Creator payout request totals from the shared finance system.",
        icon: "bi-arrow-up-circle",
        accent: "#b45309",
        softBg: "#fff7ed",
        stats: [
          { label: "Pending", value: formatCount(stats.withdrawals.pending) },
          { label: "Completed", value: formatCount(stats.withdrawals.completed) },
          { label: "Failed", value: formatCount(stats.withdrawals.failed) },
          { label: "Total requests", value: formatCount(stats.withdrawals.pending + stats.withdrawals.completed + stats.withdrawals.failed) },
        ],
      });
    }

    if (hasAnyPermission(["view_audit_logs", "export"])) {
      cards.push({
        key: "audit-logs",
        title: "Audit Logs",
        description: "Recorded OJC admin actions for accountability and operational traceability.",
        icon: "bi-clock-history",
        accent: "#64748b",
        softBg: "#f8fafc",
        stats: [
          { label: "Total logs", value: formatCount(stats.auditLogs?.total) },
          { label: "Last 24 hours", value: formatCount(stats.auditLogs?.last24Hours) },
          { label: "Moderation events", value: formatCount(stats.auditLogs?.moderationActions) },
          { label: "Admins involved", value: formatCount(stats.auditLogs?.uniqueAdmins) },
        ],
      });
    }

    return cards;
  })();

  const snapshotCards = [
    {
      label: "Total users",
      value: loading ? "..." : formatCount(stats?.snapshot.totalUsers),
      helper: "Registered profiles across the OJC platform.",
      icon: "bi-people",
      accent: "#2563eb",
      softBg: "#eff6ff",
    },
    {
      label: "Total campaigns",
      value: loading ? "..." : formatCount(stats?.snapshot.totalCampaigns),
      helper: "All cause campaigns currently stored in the system.",
      icon: "bi-collection",
      accent: "#7c3aed",
      softBg: "#eff6ff",
    },
    {
      label: "Active campaigns",
      value: loading ? "..." : formatCount(stats?.snapshot.activeCampaigns),
      helper: "Live campaigns currently visible to donors.",
      icon: "bi-megaphone",
      accent: "#16a34a",
      softBg: "#f0fdf4",
    },
    {
      label: "Total raised",
      value: loading ? "..." : formatCurrency(stats?.snapshot.totalRaised),
      helper: "Aggregate amount raised across campaign totals.",
      icon: "bi-currency-dollar",
      accent: "#d97706",
      softBg: "#fffbeb",
    },
    {
      label: "Completed donations",
      value: loading ? "..." : formatCount(stats?.snapshot.completedDonations),
      helper: "Confirmed donations recorded on the platform.",
      icon: "bi-heart",
      accent: "#0891b2",
      softBg: "#ecfeff",
    },
  ];

  const visibleAreaLabels = moduleCards.map((card) => card.title);

  return (
    <div className="overview-page">
      <div className="admin-page-header">
        <h1>Overview</h1>
        <p>Shared operational snapshot for the OnlyJustCauses workspace.</p>
      </div>

      <section className="overview-hero">
        <div className="overview-hero__content">
          <span className="overview-hero__eyebrow">Shared Snapshot</span>
          <h2 className="overview-hero__title">A common overview, shaped by your permissions.</h2>
          <p className="overview-hero__copy">
            Everyone with access to OnlyJustCauses sees the platform-wide snapshot below. Additional sections appear automatically when
            your role includes access to their related areas, so the page stays useful without turning into a second analytics dashboard.
          </p>
        </div>

        <div className="overview-hero__meta">
          <span className="overview-hero__meta-label">Visible areas</span>
          <span className="overview-hero__meta-value">{loading ? "..." : moduleCards.length}</span>
          <div className="overview-hero__chips">
            {loading ? (
              <span className="overview-hero__chip overview-hero__chip--muted">Loading overview sections</span>
            ) : visibleAreaLabels.length > 0 ? (
              visibleAreaLabels.map((label) => <span key={label} className="overview-hero__chip">{label}</span>)
            ) : (
              <span className="overview-hero__chip overview-hero__chip--muted">Shared snapshot only</span>
            )}
          </div>
        </div>
      </section>

      <section className="overview-section">
        <div className="overview-section__header">
          <div>
            <h2>Platform snapshot</h2>
            <p>Core OJC totals that are safe and relevant for every role with application access.</p>
          </div>
        </div>

        <div className="overview-snapshot-grid">
          {snapshotCards.map((card) => (
            <article key={card.label} className="overview-stat-card">
              <div className="overview-stat-card__icon" style={{ color: card.accent, background: card.softBg }}>
                <i className={`bi ${card.icon}`} />
              </div>
              <div className="overview-stat-card__body">
                <div className="overview-stat-card__value">{card.value}</div>
                <div className="overview-stat-card__label">{card.label}</div>
                <div className="overview-stat-card__helper">{card.helper}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="overview-section">
        <div className="overview-section__header">
          <div>
            <h2>Your areas</h2>
            <p>Permission-aware summaries for the parts of the platform your role can inspect.</p>
          </div>
        </div>

        {!loading && !stats ? (
          <div className="overview-note">
            <strong>Overview data could not be loaded.</strong>
            <span>The shared snapshot is temporarily unavailable. Reload the page once the backend data sources are reachable again.</span>
          </div>
        ) : !loading && moduleCards.length === 0 ? (
          <div className="overview-note">
            <strong>No extra overview modules are enabled for this role.</strong>
            <span>You still have the shared platform snapshot above, and more sections will appear automatically when your role includes the related permissions.</span>
          </div>
        ) : (
          <div className="overview-module-grid">
            {moduleCards.map((card) => (
              <article key={card.key} className="overview-module-card" style={{ borderTopColor: card.accent }}>
                <div className="overview-module-card__header">
                  <div className="overview-module-card__icon" style={{ color: card.accent, background: card.softBg }}>
                    <i className={`bi ${card.icon}`} />
                  </div>
                  <div>
                    <h3 className="overview-module-card__title">{card.title}</h3>
                    <p className="overview-module-card__description">{card.description}</p>
                  </div>
                </div>

                <div className="overview-module-card__stats">
                  {card.stats.map((stat) => (
                    <div key={`${card.key}-${stat.label}`} className="overview-module-card__stat">
                      <div className="overview-module-card__stat-value">{stat.value}</div>
                      <div className="overview-module-card__stat-label">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="overview-note">
        <strong>About these totals</strong>
        <span>
          This page is intentionally high-level and non-actionable. Trends, rankings, and export-heavy analysis still belong on the
          Analytics page, while queue work remains on the dedicated operational pages.
        </span>
      </div>
    </div>
  );
}
