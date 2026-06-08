import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Service } from "typedi";
import { PageGate } from "../domain/PageGate";
import { docClient } from "../loaders/dynamo";
import IPageGateRepo from "./IRepos/IPageGateRepo";

@Service()
export default class PageGateRepo implements IPageGateRepo {
  private tableName = "BO_PageGates";

  public async findAll(): Promise<PageGate[]> {
    const result = await docClient.send(
      new ScanCommand({ TableName: this.tableName }),
    );
    return (result.Items ?? []) as PageGate[];
  }

  public async findByApplication(application: string): Promise<PageGate[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "#app = :app",
        ExpressionAttributeNames: { "#app": "application" },
        ExpressionAttributeValues: { ":app": application },
      }),
    );
    return (result.Items ?? []) as PageGate[];
  }

  public async findById(gateId: string): Promise<PageGate | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { gateId },
      }),
    );
    return (result.Item as PageGate) ?? null;
  }

  public async save(gate: PageGate): Promise<PageGate> {
    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: gate,
      }),
    );
    return gate;
  }
}
