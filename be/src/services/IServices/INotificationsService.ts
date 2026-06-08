import type { Result } from "core/logic/Result";
import type { NotificationDTO } from "dto/NotificationDTO";

export default interface INotificationsService {
  createNotification(notification: NotificationDTO): Promise<Result<NotificationDTO>>;
}
