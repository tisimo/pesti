import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcCategoriesService from "../../services/ojc/OjcCategoriesService";
import IAuditLogService from "../../services/IServices/IAuditLogService";
import { getStringParam } from "../utils/requestParams";
import { extractActor } from "../utils/extractActor";
import { respondWithControllerError } from "../utils/serviceErrorResponse";
import Logger from "../../loaders/logger";

@Service()
export default class OjcCategoriesController {
  constructor(
    @Inject("ojcCategoriesService") private readonly service: OjcCategoriesService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
  ) {}

  public list = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const result = await this.service.listCategories();
      return res.status(200).json(result);
    } catch (err) {
      return respondWithControllerError(res, err, {
        operation: "Loading OJC categories",
        fallbackMessage: "Unable to load categories. Check the campaign categories table.",
      });
    }
  };

  public create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { name, iconName, description } = req.body as { name: string; iconName?: string; description?: string };
      const result = await this.service.createCategory(name, iconName, description);
      if (result.error) return res.status(409).json({ message: result.error });

      const actor = extractActor(req);
      this.auditLogService.log({
        ...actor,
        action: "CATEGORY_CREATED",
        targetType: "category",
        targetId: result.category!.categoryId,
        targetLabel: result.category!.name,
        details: {
          name: result.category!.name,
          slug: result.category!.slug,
          iconName: result.category!.iconName,
          description: result.category!.description,
          isActive: result.category!.isActive,
        },
      }).catch((error) => {
        Logger.warn({ err: error, categoryId: result.category!.categoryId }, "[OjcCategoriesController] Failed to write create audit log");
      });

      return res.status(201).json(result.category);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Creating OJC category",
        fallbackMessage: "Unable to create category. Check that the category schema is migrated.",
      });
    }
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    try {
      const categoryId = getStringParam(req.params.id);
      if (!categoryId) return res.status(400).json({ message: "Invalid category ID" });

      const { name, iconName, description, isActive } = req.body as {
        name?: string; iconName?: string | null; description?: string | null; isActive?: boolean;
      };

      const result = await this.service.updateCategory(categoryId, { name, iconName, description, isActive });
      if (result.notFound) return res.status(404).json({ message: "Category not found" });
      if (result.error) return res.status(409).json({ message: result.error });

      const previous = result.previous;
      const next = result.category;
      const changedFields = [
        previous && next && previous.name !== next.name ? "name" : null,
        previous && next && previous.slug !== next.slug ? "slug" : null,
        previous && next && previous.iconName !== next.iconName ? "iconName" : null,
        previous && next && previous.description !== next.description ? "description" : null,
        previous && next && previous.isActive !== next.isActive ? "isActive" : null,
      ].filter((field): field is string => Boolean(field));

      const actor = extractActor(req);
      this.auditLogService.log({
        ...actor,
        action: "CATEGORY_UPDATED",
        targetType: "category",
        targetId: categoryId,
        targetLabel: next?.name ?? previous?.name ?? categoryId,
        details: {
          changedFields,
          previous: previous
            ? {
                name: previous.name,
                slug: previous.slug,
                iconName: previous.iconName,
                description: previous.description,
                isActive: previous.isActive,
              }
            : null,
          next: next
            ? {
                name: next.name,
                slug: next.slug,
                iconName: next.iconName,
                description: next.description,
                isActive: next.isActive,
              }
            : null,
          name: previous && next && previous.name !== next.name ? next.name : undefined,
          iconName: previous && next && previous.iconName !== next.iconName ? next.iconName : undefined,
          description: previous && next && previous.description !== next.description ? next.description : undefined,
          isActive: previous && next && previous.isActive !== next.isActive ? next.isActive : undefined,
        },
      }).catch((error) => {
        Logger.warn({ err: error, categoryId }, "[OjcCategoriesController] Failed to write update audit log");
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Updating OJC category",
        fallbackMessage: "Unable to update category. Check that the category exists and the schema is migrated.",
      });
    }
  };

  public remove = async (req: Request, res: Response): Promise<Response> => {
    try {
      const categoryId = getStringParam(req.params.id);
      if (!categoryId) return res.status(400).json({ message: "Invalid category ID" });

      const result = await this.service.deleteCategory(categoryId);
      if (result.notFound) return res.status(404).json({ message: "Category not found" });
      if (result.error) return res.status(409).json({ message: result.error });

      const actor = extractActor(req);
      this.auditLogService.log({
        ...actor,
        action: "CATEGORY_DELETED",
        targetType: "category",
        targetId: categoryId,
        targetLabel: result.name,
        details: { name: result.name },
      }).catch((error) => {
        Logger.warn({ err: error, categoryId }, "[OjcCategoriesController] Failed to write delete audit log");
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Deleting OJC category",
        fallbackMessage: "Unable to delete category. Check for linked campaigns or missing category schema.",
      });
    }
  };
}
