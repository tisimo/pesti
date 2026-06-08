export type NotificationDTO = {
  notificationId: string;
  profileId: string;
  type: string;
  isRead: boolean;
  actorProfileId: string;
  actorUsername: string;
  actorAvatarUrl: string | null;
  relatedId: string | null;
  createdAt: Date | string;
  ttl: number;
};
