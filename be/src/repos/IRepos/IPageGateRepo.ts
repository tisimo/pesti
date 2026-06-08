import { PageGate } from "../../domain/PageGate";

export default interface IPageGateRepo {
  findAll(): Promise<PageGate[]>;
  findByApplication(application: string): Promise<PageGate[]>;
  findById(gateId: string): Promise<PageGate | null>;
  save(gate: PageGate): Promise<PageGate>;
}
