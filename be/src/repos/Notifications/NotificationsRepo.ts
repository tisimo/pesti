import { Service } from "typedi";
import { INotificationsRepo } from "./INotificationsRepo";
import { Notification } from "../../domain/Notification";
import { NotificationPersistence } from "../../dataschema/NotificationPersistence";
import { NotificationMap } from "../../mappers/NotificationMapper";
import { docClient } from "../../loaders/dynamo";
import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Logger from "../../loaders/logger";

@Service()
export default class NotificationsRepo implements INotificationsRepo {
  private table = "Notifications";

  public async getNotificationById(notificationId: string): Promise<Notification | null> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: "notificationId = :nid",
        ExpressionAttributeValues: { ":nid": notificationId },
        Limit: 1,
      }),
    );

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return NotificationMap.fromPersistence(result.Items[0] as NotificationPersistence);
  }

  public async getRecentUnseenNotifications(profileId: string): Promise<Notification[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: "profileId-Index",
        KeyConditionExpression: "profileId = :pid",
        ExpressionAttributeValues: {
          ":pid": profileId,
        },
        ScanIndexForward: false,
        Limit: 20,
      }),
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map(item => NotificationMap.fromPersistence(item as NotificationPersistence));
  }

  public async createNotification(notification: Notification): Promise<Notification> {
    const item = NotificationMap.toPersistence(notification);

    await docClient.send(
      new PutCommand({
        TableName: this.table,
        Item: {
          ...item,
          createdAt: item.createdAt.toISOString(),
        },
      }),
    );

    Logger.info({ notificationId: notification.notificationId }, "Created New Notification.");

    return notification;
  }

  public async updateSeenStatus(notificationId: string, seen: boolean): Promise<Notification> {
    const queryResult = await docClient.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: "notificationId = :nid",
        ExpressionAttributeValues: { ":nid": notificationId },
        Limit: 1,
      }),
    );

    if (!queryResult.Items || queryResult.Items.length === 0) {
      throw new Error("Notification Not Found!");
    }

    const existing = queryResult.Items[0];

    await docClient.send(
      new UpdateCommand({
        TableName: this.table,
        Key: {
          notificationId: existing.notificationId,
          createdAt: existing.createdAt,
        },
        UpdateExpression: "SET isRead = :seen",
        ExpressionAttributeValues: { ":seen": seen },
      }),
    );

    return NotificationMap.fromPersistence({ ...existing, isRead: seen } as NotificationPersistence);
  }

  public async deleteNotification(notificationId: string): Promise<void> {
    const queryResult = await docClient.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: "notificationId = :nid",
        ExpressionAttributeValues: { ":nid": notificationId },
        Limit: 1,
      }),
    );

    if (!queryResult.Items || queryResult.Items.length === 0) {
      throw new Error("Notification Not Found!");
    }

    const existing = queryResult.Items[0];

    await docClient.send(
      new DeleteCommand({
        TableName: this.table,
        Key: {
          notificationId: existing.notificationId,
          createdAt: existing.createdAt,
        },
      }),
    );

    Logger.info({ notificationId }, "Deleted Notification.");
  }
}
