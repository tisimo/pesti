import { Notification } from "domain/Notification";

export interface INotificationsRepo {
  getNotificationById(notificationId: string): Promise<Notification | null>;
  getRecentUnseenNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: Notification): Promise<Notification>;
  updateSeenStatus(notificationId: string, seen: boolean): Promise<Notification>;
  deleteNotification(notificationId: string): Promise<void>;
}
