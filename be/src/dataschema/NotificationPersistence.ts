export type NotificationPersistence = {
  notificationId: string;
  profileId: string;
  type:
    | "DONATION"
    | "MILESTONE"
    | "FOLLOWER"
    | "UPDATE"
    | "ENDING"
    | "WITHDRAWAL"
    | "MESSAGE"
    | "VERIFICATION"
    | "CAMPAIGN-STATUS"
    | "REPORT";
  isRead: boolean;
  actorProfileId: string;
  actorUsername: string;
  actorAvatarUrl: string | null;
  relatedId: string | null;
  createdAt: Date;
  ttl: number;
};
