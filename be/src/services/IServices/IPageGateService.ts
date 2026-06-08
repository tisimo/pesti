import { PageGate } from "../../domain/PageGate";

export default interface IPageGateService {
  getAll(application?: string): Promise<PageGate[]>;
  update(gateId: string, requiredPermissions: string[]): Promise<PageGate>;
}
