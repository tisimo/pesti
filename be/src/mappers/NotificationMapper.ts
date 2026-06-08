import { Mapper } from "../core/infra/Mapper";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { NotificationPersistence } from "../dataschema/NotificationPersistence";
import { Notification, NotificationType } from "../domain/Notification";
import { NotificationDTO } from "../dto/NotificationDTO";

export class NotificationMap extends Mapper<Notification> {
  /**
   * Domain -> DTO
   */
  public static toDTO(notification: Notification): NotificationDTO {
    return {
      notificationId: notification.notificationId,
      profileId: notification.profileId,
      type: notification.type,
      isRead: notification.isRead,
      actorProfileId: notification.actorProfileId,
      actorUsername: notification.actorUsername,
      actorAvatarUrl: notification.actorAvatarUrl,
      relatedId: notification.relatedId,
      createdAt: notification.createdAt,
      ttl: notification.props.ttl,
    };
  }

  /**
   * DTO -> DOMAIN
   */
  public static toDomain(dto: NotificationDTO): Notification {
    const notificationOrError = Notification.create(
      {
        notificationId: dto.notificationId,
        profileId: dto.profileId,
        type: dto.type as NotificationType,
        isRead: dto.isRead ?? false,
        actorProfileId: dto.actorProfileId,
        actorUsername: dto.actorUsername,
        actorAvatarUrl: dto.actorAvatarUrl,
        relatedId: dto.relatedId,
        createdAt: new Date(dto.createdAt),
        ttl: dto.ttl,
      },
      new UniqueEntityID(dto.notificationId),
    );

    if (notificationOrError.isFailure) {
      throw new Error(`NotificationMap.toDomain Failed: ${notificationOrError.error}`);
    }

    return notificationOrError.getValue();
  }

  /**
   * DOMAIN -> PERSISTENCE
   */
  public static toPersistence(notification: Notification): NotificationPersistence {
    return {
      notificationId: notification.notificationId.toString(),
      profileId: notification.profileId,
      type: notification.type as
        | "DONATION"
        | "MILESTONE"
        | "FOLLOWER"
        | "UPDATE"
        | "ENDING"
        | "WITHDRAWAL"
        | "MESSAGE"
        | "VERIFICATION"
        | "CAMPAIGN-STATUS"
        | "REPORT",
      isRead: notification.isRead,
      actorProfileId: notification.actorProfileId,
      actorUsername: notification.actorUsername,
      actorAvatarUrl: notification.actorAvatarUrl,
      relatedId: notification.relatedId,
      createdAt: notification.createdAt,
      ttl: notification.ttl,
    };
  }

  /**
   * PERSISTENCE -> DOMAIN
   */
  public static fromPersistence(raw: NotificationPersistence): Notification {
    const notificationOrError = Notification.create(
      {
        notificationId: raw.notificationId,
        profileId: raw.profileId,
        type: raw.type,
        isRead: raw.isRead,
        actorProfileId: raw.actorProfileId,
        actorUsername: raw.actorUsername,
        actorAvatarUrl: raw.actorAvatarUrl,
        relatedId: raw.relatedId,
        createdAt: new Date(raw.createdAt),
        ttl: raw.ttl,
      },
      new UniqueEntityID(raw.notificationId),
    );

    if (notificationOrError.isFailure) {
      throw new Error(`MessageMap.fromPersistence Failed: ${notificationOrError.error}`);
    }

    return notificationOrError.getValue();
  }
}
