import { Inject, Service } from "typedi";
import OjcCategoriesRepo, { Category, CategorySnapshot } from "../../repos/ojc/OjcCategoriesRepo";

@Service()
export default class OjcCategoriesService {
  constructor(@Inject("ojcCategoriesRepo") private readonly repo: OjcCategoriesRepo) {}

  public async listCategories() {
    return this.repo.listCategories();
  }

  public async createCategory(
    name: string,
    iconName?: string | null,
    description?: string | null,
  ): Promise<{ error?: string; category?: Category }> {
    const trimmed = name.trim();
    if (!trimmed) return { error: "Name is required" };

    const exists = await this.repo.findByName(trimmed);
    if (exists) return { error: "A category with this name already exists" };

    const slug = this.repo.toSlug(trimmed);
    const category = await this.repo.create({ name: trimmed, slug, iconName, description });
    return { category };
  }

  public async updateCategory(
    categoryId: string,
    fields: { name?: string; iconName?: string | null; description?: string | null; isActive?: boolean },
  ): Promise<{ error?: string; notFound?: boolean; updated?: boolean; previous?: CategorySnapshot; category?: CategorySnapshot | null }> {
    const existing = await this.repo.getById(categoryId);
    if (!existing) return { notFound: true };

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (!trimmed) return { error: "Name is required" };
      const conflict = await this.repo.findByName(trimmed, categoryId);
      if (conflict) return { error: "A category with this name already exists" };
      fields.name = trimmed;
    }

    const slug = fields.name !== undefined ? this.repo.toSlug(fields.name) : undefined;
    const updated = await this.repo.update(categoryId, { ...fields, slug });
    const category = updated ? await this.repo.getById(categoryId) : existing;
    return { updated, previous: existing, category };
  }

  public async deleteCategory(categoryId: string): Promise<{ error?: string; notFound?: boolean; deleted?: boolean; name?: string }> {
    const existing = await this.repo.getById(categoryId);
    if (!existing) return { notFound: true };

    const count = await this.repo.campaignCount(categoryId);
    if (count > 0) return { error: `Cannot delete "${existing.name}" — it is used by ${count} campaign${count > 1 ? "s" : ""}` };

    const deleted = await this.repo.delete(categoryId);
    return { deleted, name: existing.name };
  }
}
