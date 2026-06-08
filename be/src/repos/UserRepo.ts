import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Service } from "typedi";
import User from "../domain/User";
import { docClient } from "../loaders/dynamo";
import UserMapper from "../mappers/UserMapper";
import IUserRepo from "./IRepos/IUserRepo";

@Service()
export default class UserRepo implements IUserRepo {
  private tableName = "BO_Users";

  public async exists(User: User): Promise<boolean> {
    const found = await this.findById(User.userId);
    return Boolean(found);
  }

  public async save(User: User): Promise<User> {
    const item = UserMapper.toPersistence(User);
    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
    return User;
  }

  public async findAll(): Promise<User[]> {
    const result = await docClient.send(new ScanCommand({ TableName: this.tableName }));
    const items = (result.Items || []) as any[];
    return items.map(item => UserMapper.toDomain(item));
  }

  public async findAllInactive(): Promise<User[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "#s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "INACTIVE" },
      }),
    );
    const items = (result.Items || []) as any[];
    return items.map(item => UserMapper.toDomain(item));
  }

  public async findById(id: string): Promise<User | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { userId: id },
      }),
    );
    if (!result.Item) return null;
    return UserMapper.toDomain(result.Item as any);
  }

  public async findByName(name: string): Promise<User | null> {
    return this.findByEmail(name);
  }

  public async findByEmail(email: string): Promise<User | null> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "#e = :email",
        ExpressionAttributeNames: { "#e": "email" },
        ExpressionAttributeValues: { ":email": email },
      }),
    );
    if (!result.Items || result.Items.length === 0) return null;
    return UserMapper.toDomain(result.Items[0] as any);
  }

  public async findByCognitoSub(sub: string): Promise<User | null> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "#cs = :sub",
        ExpressionAttributeNames: { "#cs": "cognitoSub" },
        ExpressionAttributeValues: { ":sub": sub },
      }),
    );
    if (!result.Items || result.Items.length === 0) return null;
    return UserMapper.toDomain(result.Items[0] as any);
  }

  public async create(User: User): Promise<User> {
    return this.save(User);
  }

  public async update(User: User): Promise<User> {
    return this.save(User);
  }

  public async delete(id: string): Promise<void> {
    //Soft-delete?
    await docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { userId: id },
      }),
    );
  }

  public async deactivate(id: string): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { userId: id },
        UpdateExpression: "SET #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "INACTIVE" },
      }),
    );
  }

  public async reactivate(id: string): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { userId: id },
        UpdateExpression: "SET #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "ACTIVE" },
      }),
    );
  }

  public async reassignRole(fromRoleId: string, toRoleId: string): Promise<void> {
    const result = await docClient.send(new ScanCommand({ TableName: this.tableName }));
    const items = (result.Items || []) as any[];
    const affected = items.filter((item) => {
      const roleIds = Array.isArray(item.roleIds) ? item.roleIds : item.roleId ? [item.roleId] : [];
      return roleIds.includes(fromRoleId);
    });

    await Promise.all(
      affected.map(item => {
        const roleIds = Array.isArray(item.roleIds) ? item.roleIds : item.roleId ? [item.roleId] : [];
        const nextRoleIds = roleIds.filter((roleId: string) => roleId !== fromRoleId && roleId !== toRoleId);
        if (toRoleId && toRoleId !== fromRoleId) nextRoleIds.push(toRoleId);
        const nextPrimaryRoleId = nextRoleIds[0];

        return docClient.send(
          new UpdateCommand({
            TableName: this.tableName,
            Key: { userId: item.userId },
            UpdateExpression: nextPrimaryRoleId
              ? "SET #rs = :roleIds, #r = :roleId"
              : "SET #rs = :roleIds REMOVE #r",
            ExpressionAttributeNames: { "#rs": "roleIds", "#r": "roleId" },
            ExpressionAttributeValues: nextPrimaryRoleId
              ? { ":roleIds": nextRoleIds, ":roleId": nextPrimaryRoleId }
              : { ":roleIds": nextRoleIds },
          }),
        );
      }),
    );
  }
}
