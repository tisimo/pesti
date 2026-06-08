import { Inject, Service } from "typedi";
import { Result } from "../core/logic/Result";
import { NotificationDTO } from "../dto/NotificationDTO";
import INotificationsService from "./IServices/INotificationsService";
import { INotificationsRepo } from "../repos/Notifications/INotificationsRepo";
import NotificationsRepo from "../repos/Notifications/NotificationsRepo";
import { NotificationMap } from "../mappers/NotificationMapper";
import Logger from "../loaders/logger";

@Service()
export default class NotificationsService implements INotificationsService {
  constructor(@Inject(() => NotificationsRepo) private notificationsRepo: INotificationsRepo) {}

  public async createNotification(notification: NotificationDTO): Promise<Result<NotificationDTO>> {
    try {
      const notificationDomain = NotificationMap.toDomain(notification);
      const saved = await this.notificationsRepo.createNotification(notificationDomain);

      const dto = NotificationMap.toDTO(saved);

      return Result.ok<NotificationDTO>(dto);
    } catch (error) {
      Logger.error({ err: error, notificationId: notification?.notificationId }, "Error creating notification");
      return Result.fail<NotificationDTO>(error?.message ?? "Error Creating Notification!");
    }
  }
}
