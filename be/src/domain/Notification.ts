import { AggregateRoot } from "../core/domain/AggregateRoot";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Result } from "../core/logic/Result";
import { Guard } from "../core/logic/Guard";

export type NotificationType =
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

export interface NotificationProps {
  notificationId: string;
  profileId: string;
  type: NotificationType;
  isRead: boolean;
  actorProfileId: string;
  actorUsername: string;
  actorAvatarUrl: string | null;
  relatedId: string | null;
  createdAt: Date;
  ttl: number;
}

export class Notification extends AggregateRoot<NotificationProps> {
  get id(): UniqueEntityID {
    return this._id;
  }

  get notificationId(): string {
    return this.props.notificationId;
  }

  get profileId(): string {
    return this.props.profileId;
  }

  get type(): string {
    return this.props.type;
  }

  get isRead(): boolean {
    return this.props.isRead;
  }

  get actorProfileId(): string {
    return this.props.actorProfileId;
  }

  get actorUsername(): string | null {
    return this.props.actorUsername;
  }

  get actorAvatarUrl(): string | null {
    return this.props.actorAvatarUrl;
  }

  get relatedId(): string | null {
    return this.props.relatedId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
  get ttl(): number {
    return this.props.ttl;
  }

  private constructor(props: NotificationProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(props: NotificationProps, id?: UniqueEntityID): Result<Notification> {
    const guardedProps = [
      { argument: props.notificationId, argumentName: "notificationId" },
      { argument: props.profileId, argumentName: "profileId" },
      { argument: props.actorProfileId, argumentName: "actorProfileId" },
    ];

    const guardResult = Guard.againstNullOrUndefinedBulk(guardedProps);

    if (!guardResult.succeeded) {
      return Result.fail<Notification>(guardResult.message);
    }

    if (!props.notificationId && !props.profileId && !props.type && !props.actorProfileId) {
      return Result.fail<Notification>("Must provide notificationId, profileId, type and actorProfileId");
    }

    const notification = new Notification(
      {
        ...props,
        isRead: props.isRead ?? false,
        createdAt: props.createdAt ?? new Date(),
      },
      id ?? new UniqueEntityID(),
    );

    return Result.ok<Notification>(notification);
  }
}
