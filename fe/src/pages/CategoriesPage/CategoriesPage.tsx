import { useEffect, useMemo, useState } from "react";
import { apiBackoffice } from "@/shared/lib/axios";
import { useAnyPermission } from "@/shared/hooks/usePermission";
import bootstrapIcons from "bootstrap-icons/font/bootstrap-icons.json";
import "./categoriesPage.css";

interface Category {
  categoryId: string;
  name: string;
  slug: string;
  iconName: string | null;
  description: string | null;
  isActive: boolean;
  campaignCount: number;
  activeCampaigns: number;
  finishedCampaigns: number;
  totalRaised: number;
  totalDonors: number;
  createdAt: string;
  updatedAt: string;
}

type CategoryFilter = "all" | "active" | "inactive" | "used";
type EditorMode = "create" | "edit";

const FONT_AWESOME_ICON_ALIASES: Record<string, string> = {
  paw: "fa-solid fa-paw",
  child: "fa-solid fa-child",
  "child-reaching": "fa-solid fa-child",
  "graduation-cap": "fa-solid fa-graduation-cap",
  book: "fa-solid fa-book",
  "book-open": "fa-solid fa-book",
  briefcase: "fa-solid fa-briefcase",
  "triangle-exclamation": "fa-solid fa-triangle-exclamation",
  leaf: "fa-solid fa-leaf",
  seedling: "fa-solid fa-leaf",
  droplet: "fa-solid fa-droplet",
  "faucet-drip": "fa-solid fa-droplet",
  tint: "fa-solid fa-droplet",
  palette: "fa-solid fa-palette",
  building: "fa-solid fa-building",
  "house-chimney": "fa-solid fa-house-chimney",
  house: "fa-solid fa-house",
  "heart-beat": "fa-solid fa-heart-pulse",
  heartbeat: "fa-solid fa-heart-pulse",
  heart: "fa-solid fa-heart",
  "scale-balanced": "fa-solid fa-scale-balanced",
  "balance-scale": "fa-solid fa-scale-balanced",
  person: "fa-solid fa-user",
};

const CATEGORY_ICON_FALLBACKS: Record<string, string> = {
  animals: "fa-solid fa-paw",
  "arts-&-culture": "fa-solid fa-palette",
  children: "fa-solid fa-child",
  education: "fa-solid fa-graduation-cap",
  emergency: "fa-solid fa-triangle-exclamation",
  entrepreneurship: "fa-solid fa-briefcase",
  environment: "fa-solid fa-leaf",
  health: "fa-solid fa-heart-pulse",
  housing: "fa-solid fa-house-chimney",
  "human-rights": "fa-solid fa-scale-balanced",
  "water-&-sanitation": "fa-solid fa-droplet",
};

const BOOTSTRAP_ICON_NAMES = new Set(Object.keys(bootstrapIcons));

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function normalizeIconToken(value: string) {
  const tokens = value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/^bi-/, ""))
    .filter((token) => !["bi", "fa", "fas", "far", "fal", "fab", "fa-solid", "fa-regular", "fa-light", "fa-brands"].includes(token));

  const candidate = tokens.find((token) => token.startsWith("fa-")) ?? tokens[tokens.length - 1] ?? value;
  return toLookupKey(candidate.replace(/^fa-/, "").replace(/^bi-/, ""));
}

function resolveIconClass(iconName?: string | null, categoryName?: string | null): string {
  const rawIcon = iconName?.trim();

  if (rawIcon) {
    if (rawIcon.startsWith("bi bi-")) return rawIcon;
    if (rawIcon.startsWith("bi-")) return `bi ${rawIcon}`;

    const normalizedIcon = normalizeIconToken(rawIcon);
    const fontAwesomeIcon = FONT_AWESOME_ICON_ALIASES[normalizedIcon];
    if (fontAwesomeIcon) {
      return fontAwesomeIcon;
    }

    if (BOOTSTRAP_ICON_NAMES.has(normalizedIcon)) {
      return `bi bi-${normalizedIcon}`;
    }
  }

  if (categoryName?.trim()) {
    const normalizedCategoryName = toLookupKey(categoryName);
    const fallbackIcon = CATEGORY_ICON_FALLBACKS[normalizedCategoryName];
    if (fallbackIcon) return fallbackIcon;
  }

  return "bi bi-tag";
}

function CategoryIcon({ iconName, categoryName }: { iconName?: string | null; categoryName?: string | null }) {
  return <i className={resolveIconClass(iconName, categoryName)} aria-hidden="true" />;
}

function CategoryEditorModal({
  mode,
  initialCategory,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  mode: EditorMode;
  initialCategory?: Category | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: { name: string; iconName: string | null; description: string | null }) => void;
}) {
  const [name, setName] = useState(initialCategory?.name ?? "");
  const [iconName, setIconName] = useState(initialCategory?.iconName ?? "");
  const [description, setDescription] = useState(initialCategory?.description ?? "");

  useEffect(() => {
    setName(initialCategory?.name ?? "");
    setIconName(initialCategory?.iconName ?? "");
    setDescription(initialCategory?.description ?? "");
  }, [initialCategory, mode]);

  return (
    <div className="categories-page__modal-backdrop" onClick={onClose}>
      <div className="categories-page__modal" onClick={(event) => event.stopPropagation()}>
        <div className="categories-page__modal-header">
          <div>
            <h3>{mode === "create" ? "Create category" : "Edit category"}</h3>
            <p>Manage the category details that creators see when publishing causes.</p>
          </div>
          <button type="button" className="categories-page__icon-button" onClick={onClose} aria-label="Close modal">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="categories-page__modal-body">
          <div className="categories-page__icon-preview">
            <span className="categories-page__icon-token">
              <CategoryIcon iconName={iconName} categoryName={name} />
            </span>
            <div>
              <strong>{name.trim() || "Category preview"}</strong>
              <p>{description.trim() || "Add a short explanation to help admins recognise this category quickly."}</p>
            </div>
          </div>

          <div className="categories-page__field">
            <label htmlFor="category-name">Name</label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Environment"
              autoComplete="off"
            />
          </div>

          <div className="categories-page__field">
            <label htmlFor="category-icon">Icon name</label>
            <input
              id="category-icon"
              type="text"
              value={iconName}
              onChange={(event) => setIconName(event.target.value)}
              placeholder="e.g. paw or triangle-exclamation"
              autoComplete="off"
            />
            <small className="categories-page__field-hint">
              Accepts the same icon names used in JustCauses, including values like <code>paw</code>, <code>book-open</code>, or <code>triangle-exclamation</code>.
            </small>
          </div>

          <div className="categories-page__field">
            <label htmlFor="category-description">Description</label>
            <textarea
              id="category-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description shown to admins."
            />
          </div>

          {error ? <div className="categories-page__error">{error}</div> : null}
        </div>

        <div className="categories-page__modal-footer">
          <button type="button" className="categories-page__button categories-page__button--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="categories-page__button categories-page__button--primary"
            disabled={saving}
            onClick={() =>
              onSubmit({
                name,
                iconName: iconName.trim() || null,
                description: description.trim() || null,
              })
            }
          >
            {saving ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create category" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({
  category,
  deleting,
  error,
  onClose,
  onDelete,
}: {
  category: Category;
  deleting: boolean;
  error: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="categories-page__modal-backdrop" onClick={onClose}>
      <div className="categories-page__modal categories-page__modal--compact" onClick={(event) => event.stopPropagation()}>
        <div className="categories-page__modal-header">
          <div>
            <h3>Delete category?</h3>
            <p>This will permanently remove {category.name} from the category list.</p>
          </div>
        </div>

        <div className="categories-page__modal-body">
          <div className="categories-page__warning">
            <strong>{category.name}</strong> can only be deleted if no causes are using it.
          </div>
          {error ? <div className="categories-page__error">{error}</div> : null}
        </div>

        <div className="categories-page__modal-footer">
          <button type="button" className="categories-page__button categories-page__button--ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="categories-page__button categories-page__button--danger" onClick={onDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const canManageCategories = useAnyPermission(["edit_categories"]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editorError, setEditorError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function loadCategories() {
    setLoading(true);
    try {
      const response = await apiBackoffice.get<{ categories: Category[] }>("/ojc/categories");
      setCategories(response.data.categories ?? []);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    if (filter === "active") return categories.filter((category) => category.isActive);
    if (filter === "inactive") return categories.filter((category) => !category.isActive);
    if (filter === "used") return categories.filter((category) => category.campaignCount > 0);
    return categories;
  }, [categories, filter]);

  const metrics = useMemo(() => ({
    total: categories.length,
    active: categories.filter((category) => category.isActive).length,
    inUse: categories.filter((category) => category.campaignCount > 0).length,
    totalRaised: categories.reduce((sum, category) => sum + category.totalRaised, 0),
  }), [categories]);

  const deletingCategory = categories.find((category) => category.categoryId === deletingId) ?? null;

  function openCreateModal() {
    setEditorMode("create");
    setSelectedCategory(null);
    setEditorError("");
    setEditorOpen(true);
  }

  function openEditModal(category: Category) {
    setEditorMode("edit");
    setSelectedCategory(category);
    setEditorError("");
    setEditorOpen(true);
  }

  async function handleSaveCategory(payload: { name: string; iconName: string | null; description: string | null }) {
    if (!payload.name.trim()) {
      setEditorError("Name is required.");
      return;
    }

    setSaving(true);
    setEditorError("");
    try {
      if (editorMode === "create") {
        await apiBackoffice.post("/ojc/categories", payload);
      } else if (selectedCategory) {
        await apiBackoffice.patch(`/ojc/categories/${selectedCategory.categoryId}`, payload);
      }

      setEditorOpen(false);
      setSelectedCategory(null);
      await loadCategories();
    } catch (error: any) {
      setEditorError(error?.response?.data?.message ?? `Failed to ${editorMode === "create" ? "create" : "update"} category.`);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(category: Category) {
    setTogglingId(category.categoryId);
    try {
      await apiBackoffice.patch(`/ojc/categories/${category.categoryId}`, { isActive: !category.isActive });
      await loadCategories();
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDeleteCategory() {
    if (!deletingCategory) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiBackoffice.delete(`/ojc/categories/${deletingCategory.categoryId}`);
      setDeletingId(null);
      await loadCategories();
    } catch (error: any) {
      setDeleteError(error?.response?.data?.message ?? "Failed to delete category.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="categories-page">
      <div className="admin-page-header categories-page__header">
        <div>
          <h1>Categories</h1>
          <p>Manage the category catalogue creators can choose from when creating causes.</p>
        </div>

        {canManageCategories ? (
          <button type="button" className="categories-page__button categories-page__button--primary" onClick={openCreateModal}>
            Add category
          </button>
        ) : null}
      </div>

      <section className="categories-page__metrics">
        <div className="categories-page__metric">
          <span>Total categories</span>
          <strong>{metrics.total}</strong>
        </div>
        <div className="categories-page__metric">
          <span>Active now</span>
          <strong>{metrics.active}</strong>
        </div>
        <div className="categories-page__metric">
          <span>Used by causes</span>
          <strong>{metrics.inUse}</strong>
        </div>
        <div className="categories-page__metric">
          <span>Raised across categories</span>
          <strong>{formatMoney(metrics.totalRaised)}</strong>
        </div>
      </section>

      <section className="categories-page__toolbar">
        <div className="categories-page__filters">
          {[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "used", label: "In use" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={`categories-page__filter ${filter === item.value ? "categories-page__filter--active" : ""}`}
              onClick={() => setFilter(item.value as CategoryFilter)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="categories-page__toolbar-note">
          Active categories become available to creators immediately after saving.
        </div>
      </section>

      {loading ? (
        <div className="categories-page__state">
          <div className="spinner-border" role="status" style={{ width: "1.8rem", height: "1.8rem", color: "#0047AB" }} />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="categories-page__empty">
          <h3>No categories found</h3>
          <p>{filter === "all" ? "There are no categories available yet." : "No categories match the current filter."}</p>
        </div>
      ) : (
        <div className="categories-page__grid">
          {filteredCategories.map((category, index) => (
            <article key={category.categoryId} className={`categories-page__card ${!category.isActive ? "categories-page__card--inactive" : ""}`}>
              <div className="categories-page__card-header">
                <div className="categories-page__identity">
                  <span className="categories-page__icon-token">
                    <CategoryIcon iconName={category.iconName} categoryName={category.name} />
                  </span>
                  <div>
                    <h3>{category.name}</h3>
                    <p>{category.description || "No description provided."}</p>
                  </div>
                </div>

                <div className="categories-page__badge-stack">
                  <span className={`categories-page__badge ${category.isActive ? "categories-page__badge--active" : "categories-page__badge--inactive"}`}>
                    {category.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="categories-page__badge categories-page__badge--muted">Position #{index + 1}</span>
                </div>
              </div>

              <div className="categories-page__meta">
                <div><span>Slug</span><strong>{category.slug}</strong></div>
                <div><span>Causes</span><strong>{category.campaignCount}</strong></div>
                <div><span>Active causes</span><strong>{category.activeCampaigns}</strong></div>
                <div><span>Total donors</span><strong>{category.totalDonors}</strong></div>
              </div>

              <div className="categories-page__stats">
                <div className="categories-page__stat">
                  <span>Total raised</span>
                  <strong>{formatMoney(category.totalRaised)}</strong>
                </div>
                <div className="categories-page__stat">
                  <span>Finished causes</span>
                  <strong>{category.finishedCampaigns}</strong>
                </div>
              </div>

              <div className="categories-page__card-footer">
                <div className="categories-page__dates">
                  <span>Created {formatDate(category.createdAt)}</span>
                  <span>Updated {formatDate(category.updatedAt)}</span>
                </div>

                {canManageCategories ? (
                  <div className="categories-page__actions">
                    <button type="button" className="categories-page__button categories-page__button--ghost" onClick={() => openEditModal(category)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="categories-page__button categories-page__button--ghost"
                      disabled={togglingId === category.categoryId}
                      onClick={() => void handleToggleActive(category)}
                    >
                      {category.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      className="categories-page__button categories-page__button--danger-outline"
                      disabled={category.campaignCount > 0}
                      title={category.campaignCount > 0 ? "Cannot delete while causes use this category." : "Delete category"}
                      onClick={() => {
                        setDeletingId(category.categoryId);
                        setDeleteError("");
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>

              {category.campaignCount > 0 ? (
                <div className="categories-page__usage-note">
                  This category is currently used by {category.campaignCount} cause{category.campaignCount === 1 ? "" : "s"}, so it cannot be deleted.
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {editorOpen ? (
        <CategoryEditorModal
          mode={editorMode}
          initialCategory={selectedCategory}
          saving={saving}
          error={editorError}
          onClose={() => {
            setEditorOpen(false);
            setEditorError("");
            setSelectedCategory(null);
          }}
          onSubmit={handleSaveCategory}
        />
      ) : null}

      {deletingCategory ? (
        <DeleteConfirmationModal
          category={deletingCategory}
          deleting={deleting}
          error={deleteError}
          onClose={() => {
            setDeletingId(null);
            setDeleteError("");
          }}
          onDelete={() => void handleDeleteCategory()}
        />
      ) : null}
    </div>
  );
}
