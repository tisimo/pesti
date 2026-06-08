import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Service } from "typedi";
import Role from "../domain/Role";
import { docClient } from "../loaders/dynamo";
import RoleMapper from "../mappers/RoleMapper";
import IRoleRepo from "./IRepos/IRoleRepo";

@Service()
export default class RoleRepo implements IRoleRepo {
  private tableName = "BO_Roles";

  public async exists(role: Role): Promise<boolean> {
    const found = await this.findById(role.roleId);
    return Boolean(found);
  }

  public async save(role: Role): Promise<Role> {
    const item = RoleMapper.toPersistence(role);
    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
    return role;
  }

  public async findAll(): Promise<Role[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "(#s = :status OR attribute_not_exists(#s)) AND (#d = :false OR attribute_not_exists(#d))",
        ExpressionAttributeNames: { "#s": "status", "#d": "isDefault" },
        ExpressionAttributeValues: { ":status": "ACTIVE", ":false": false },
      }),
    );
    const items = (result.Items || []) as any[];
    return items.map((item) => RoleMapper.toDomain(item));
  }

  public async findDefault(): Promise<Role | null> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "#d = :true",
        ExpressionAttributeNames: { "#d": "isDefault" },
        ExpressionAttributeValues: { ":true": true },
      }),
    );
    if (!result.Items || result.Items.length === 0) return null;
    return RoleMapper.toDomain(result.Items[0] as any);
  }

  public async findAllInactive(): Promise<Role[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "#s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "INACTIVE" },
      }),
    );
    const items = (result.Items || []) as any[];
    return items.map((item) => RoleMapper.toDomain(item));
  }

  public async findById(id: string): Promise<Role | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { roleId: id },
      }),
    );
    if (!result.Item) return null;
    return RoleMapper.toDomain(result.Item as any);
  }

  public async findByName(name: string): Promise<Role | null> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "#n = :name",
        ExpressionAttributeNames: { "#n": "name" },
        ExpressionAttributeValues: { ":name": name },
      }),
    );
    if (!result.Items || result.Items.length === 0) return null;
    return RoleMapper.toDomain(result.Items[0] as any);
  }

  public async create(role: Role): Promise<Role> {
    return this.save(role);
  }

  public async update(role: Role): Promise<Role> {
    return this.save(role);
  }

  public async delete(id: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { roleId: id },
      }),
    );
  }

  public async deactivate(id: string): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { roleId: id },
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
        Key: { roleId: id },
        UpdateExpression: "SET #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "ACTIVE" },
      }),
    );
  }

  public async removePermissionFromAll(permissionName: string): Promise<void> {
    const result = await docClient.send(new ScanCommand({ TableName: this.tableName }));
    const items = (result.Items || []) as any[];
    const affected = items.filter(
      (item) => Array.isArray(item.permissions) && item.permissions.includes(permissionName),
    );
    await Promise.all(
      affected.map((item) =>
        docClient.send(
          new UpdateCommand({
            TableName: this.tableName,
            Key: { roleId: item.roleId },
            UpdateExpression: "SET #p = :permissions",
            ExpressionAttributeNames: { "#p": "permissions" },
            ExpressionAttributeValues: {
              ":permissions": item.permissions.filter((p: string) => p !== permissionName),
            },
          }),
        ),
      ),
    );
  }

  public async renamePermissionInAll(oldName: string, newName: string): Promise<void> {
    const result = await docClient.send(new ScanCommand({ TableName: this.tableName }));
    const items = (result.Items || []) as any[];
    const affected = items.filter(
      (item) => Array.isArray(item.permissions) && item.permissions.includes(oldName),
    );
    await Promise.all(
      affected.map((item) =>
        docClient.send(
          new UpdateCommand({
            TableName: this.tableName,
            Key: { roleId: item.roleId },
            UpdateExpression: "SET #p = :permissions",
            ExpressionAttributeNames: { "#p": "permissions" },
            ExpressionAttributeValues: {
              ":permissions": item.permissions.map((p: string) => (p === oldName ? newName : p)),
            },
          }),
        ),
      ),
    );
  }
}
