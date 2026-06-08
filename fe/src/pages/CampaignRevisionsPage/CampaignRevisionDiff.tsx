import type {
  CampaignRevisionSnapshot,
  CategoryOption,
  CampaignRevisionSnapshotMediaItem,
  CampaignRevisionSnapshotBudgetItem,
} from "./campaignRevisions.api";

interface CampaignRevisionDiffProps {
  beforeSnapshot: CampaignRevisionSnapshot | null;
  afterSnapshot: CampaignRevisionSnapshot;
  categories: CategoryOption[];
  showUnchanged: boolean;
  mode?: "diff" | "snapshot";
  currentLabel?: string;
}

type DiffFieldKey =
  | "title"
  | "story"
  | "categoryId"
  | "country"
  | "city"
  | "goalAmount"
  | "durationDays"
  | "mediaItems"
  | "acceptUSDC"
  | "budgetItems";

const DIFF_FIELDS: Array<{ key: DiffFieldKey; label: string }> = [
  { key: "title", label: "Title" },
  { key: "story", label: "Story" },
  { key: "categoryId", label: "Category" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "goalAmount", label: "Goal amount" },
  { key: "durationDays", label: "Duration" },
  { key: "mediaItems", label: "Media" },
  { key: "acceptUSDC", label: "USDC payments" },
  { key: "budgetItems", label: "Budget items" },
];

function deriveMediaItems(snapshot: CampaignRevisionSnapshot | null | undefined): CampaignRevisionSnapshotMediaItem[] {
  if (!snapshot) return [];

  if (Array.isArray(snapshot.mediaItems) && snapshot.mediaItems.length > 0) {
    return snapshot.mediaItems;
  }

  const items: CampaignRevisionSnapshotMediaItem[] = [];
  if (snapshot.videoUrl?.trim()) {
    items.push({ url: snapshot.videoUrl.trim(), type: "video" });
  }
  for (const photoUrl of snapshot.photoUrls ?? []) {
    if (typeof photoUrl === "string" && photoUrl.trim()) {
      items.push({ url: photoUrl.trim(), type: "image" });
    }
  }

  const coverIndex = items.findIndex((item) => item.type === "image");
  if (coverIndex > 0) {
    const [cover] = items.splice(coverIndex, 1);
    items.unshift(cover);
  }

  return items;
}

function deriveBudgetItems(snapshot: CampaignRevisionSnapshot | null | undefined): CampaignRevisionSnapshotBudgetItem[] {
  if (!snapshot || !Array.isArray(snapshot.budgetItems)) return [];
  return snapshot.budgetItems.filter((item) => typeof item?.label === "string" && item.label.trim().length > 0);
}

function categoryLabel(categoryId: string | null | undefined, categories: CategoryOption[]) {
  if (!categoryId) return "None";
  return categories.find((category) => category.categoryId === categoryId)?.name ?? categoryId;
}

function normalizeValue(
  key: DiffFieldKey,
  snapshot: CampaignRevisionSnapshot | null,
  categories: CategoryOption[],
) {
  switch (key) {
    case "title":
      return snapshot?.title?.trim() || "";
    case "story":
      return snapshot?.story?.trim() || "";
    case "categoryId":
      return categoryLabel(snapshot?.categoryId ?? null, categories);
    case "country":
      return snapshot?.country?.trim() || "";
    case "city":
      return snapshot?.city?.trim() || "";
    case "goalAmount":
      return typeof snapshot?.goalAmount === "number" ? Number(snapshot.goalAmount.toFixed(2)) : null;
    case "durationDays":
      return typeof snapshot?.durationDays === "number" ? snapshot.durationDays : null;
    case "mediaItems":
      return deriveMediaItems(snapshot).map((item) => ({
        url: item.url,
        type: item.type,
        processingStatus: item.processingStatus ?? null,
      }));
    case "acceptUSDC":
      return snapshot?.acceptUSDC !== false;
    case "budgetItems":
      return deriveBudgetItems(snapshot).map((item) => ({
        label: item.label,
        amount: item.amount ?? 0,
      }));
    default:
      return null;
  }
}

function hasChanged(
  key: DiffFieldKey,
  beforeSnapshot: CampaignRevisionSnapshot | null,
  afterSnapshot: CampaignRevisionSnapshot,
  categories: CategoryOption[],
) {
  return JSON.stringify(normalizeValue(key, beforeSnapshot, categories))
    !== JSON.stringify(normalizeValue(key, afterSnapshot, categories));
}

function hasValue(
  key: DiffFieldKey,
  snapshot: CampaignRevisionSnapshot | null,
  categories: CategoryOption[],
) {
  const normalized = normalizeValue(key, snapshot, categories);

  if (normalized === null || normalized === "" || normalized === false) {
    return false;
  }

  if (Array.isArray(normalized)) {
    return normalized.length > 0;
  }

  return true;
}

function renderScalar(value: string | number | boolean | null, emptyLabel = "Not provided") {
  if (value === null || value === "") {
    return <span className="campaign-revisions__muted">{emptyLabel}</span>;
  }

  if (typeof value === "boolean") {
    return value ? "Enabled" : "Disabled";
  }

  if (typeof value === "number") {
    return value;
  }

  return value;
}

function assetLabelFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop() || pathname;
    return decodeURIComponent(lastSegment);
  } catch {
    const lastSegment = url.split("/").filter(Boolean).pop() || url;
    return lastSegment;
  }
}

function renderMedia(items: CampaignRevisionSnapshotMediaItem[]) {
  if (items.length === 0) {
    return (
      <div className="campaign-revisions__asset-empty">
        <i className="bi bi-image" />
        <span>No media submitted</span>
      </div>
    );
  }

  return (
    <div className="campaign-revisions__asset-list">
      {items.map((item, index) => (
        <div key={`${item.url}-${index}`} className="campaign-revisions__asset-item">
          <div className="campaign-revisions__asset-preview">
            {item.type === "image" ? (
              <img src={item.url} alt="" loading="lazy" />
            ) : (
              <div className="campaign-revisions__asset-video">
                <i className="bi bi-play-btn-fill" />
                <span>Video asset</span>
              </div>
            )}
          </div>
          <div className="campaign-revisions__asset-meta">
            <div className="campaign-revisions__asset-meta-top">
              <span className="campaign-revisions__asset-kind">{item.type === "video" ? "Video" : "Image"}</span>
              {index === 0 && item.type === "image" && (
                <span className="campaign-revisions__asset-cover">Primary</span>
              )}
              {item.processingStatus && (
                <span className="campaign-revisions__asset-status">{item.processingStatus}</span>
              )}
            </div>
            <div className="campaign-revisions__asset-name" title={assetLabelFromUrl(item.url)}>
              {assetLabelFromUrl(item.url)}
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="campaign-revisions__asset-link"
            >
              Open asset
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderBudget(items: CampaignRevisionSnapshotBudgetItem[]) {
  if (items.length === 0) {
    return <span className="campaign-revisions__muted">No budget items</span>;
  }

  return (
    <div className="campaign-revisions__budget-list">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="campaign-revisions__budget-item">
          <span>{item.label}</span>
          <strong>{typeof item.amount === "number" ? `$${item.amount.toLocaleString("en-GB")}` : "$0"}</strong>
        </div>
      ))}
    </div>
  );
}

function renderValue(
  key: DiffFieldKey,
  snapshot: CampaignRevisionSnapshot | null,
  categories: CategoryOption[],
) {
  switch (key) {
    case "story":
      return (
        <div className="campaign-revisions__text-block">
          {renderScalar(snapshot?.story?.trim() || null)}
        </div>
      );
    case "goalAmount":
      return renderScalar(
        typeof snapshot?.goalAmount === "number" ? `$${snapshot.goalAmount.toLocaleString("en-GB")}` : null,
      );
    case "durationDays":
      return renderScalar(
        typeof snapshot?.durationDays === "number" ? `${snapshot.durationDays} day${snapshot.durationDays === 1 ? "" : "s"}` : null,
      );
    case "categoryId":
      return renderScalar(categoryLabel(snapshot?.categoryId ?? null, categories));
    case "mediaItems":
      return renderMedia(deriveMediaItems(snapshot));
    case "budgetItems":
      return renderBudget(deriveBudgetItems(snapshot));
    case "acceptUSDC":
      return renderScalar(snapshot?.acceptUSDC !== false);
    default:
      return renderScalar((snapshot?.[key as keyof CampaignRevisionSnapshot] as string | null | undefined) ?? null);
  }
}

export default function CampaignRevisionDiff({
  beforeSnapshot,
  afterSnapshot,
  categories,
  showUnchanged,
  mode = "diff",
  currentLabel = "Submitted",
}: CampaignRevisionDiffProps) {
  const visibleFields = DIFF_FIELDS.filter((field) => {
    if (mode === "snapshot") {
      return hasValue(field.key, afterSnapshot, categories);
    }

    return showUnchanged || hasChanged(field.key, beforeSnapshot, afterSnapshot, categories);
  });

  if (visibleFields.length === 0) {
    return (
      <div className="campaign-revisions__empty-panel">
        No changed fields in the selected submission.
      </div>
    );
  }

  return (
    <div className="campaign-revisions__diff">
      {visibleFields.map((field) => {
        const changed = hasChanged(field.key, beforeSnapshot, afterSnapshot, categories);

        return (
          <section key={field.key} className="campaign-revisions__diff-field">
            <div className="campaign-revisions__diff-field-header">
              <h4>{field.label}</h4>
              {mode === "diff" && (
                <span className={`campaign-revisions__diff-badge${changed ? " is-changed" : ""}`}>
                  {changed ? "Changed" : "Unchanged"}
                </span>
              )}
            </div>

            {mode === "snapshot" ? (
              <div className="campaign-revisions__diff-single">
                <div className="campaign-revisions__diff-card">
                  <div className="campaign-revisions__diff-label">{currentLabel}</div>
                  <div className="campaign-revisions__diff-value">
                    {renderValue(field.key, afterSnapshot, categories)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="campaign-revisions__diff-columns">
                <div className="campaign-revisions__diff-card">
                  <div className="campaign-revisions__diff-label">Before</div>
                  <div className="campaign-revisions__diff-value">
                    {renderValue(field.key, beforeSnapshot, categories)}
                  </div>
                </div>

                <div className="campaign-revisions__diff-card">
                  <div className="campaign-revisions__diff-label">After</div>
                  <div className="campaign-revisions__diff-value">
                    {renderValue(field.key, afterSnapshot, categories)}
                  </div>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
