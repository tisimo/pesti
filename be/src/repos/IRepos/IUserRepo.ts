import { Repo } from "../../core/infra/Repo";
import User from "../../domain/User";

export default interface IUserRepo extends Repo<User> {
  findAll(): Promise<User[]>;
  findAllInactive(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByName(name: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByCognitoSub(sub: string): Promise<User | null>;
  create(User: User): Promise<User>;
  update(User: User): Promise<User>;
  delete(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  reactivate(id: string): Promise<void>;
  reassignRole(fromRoleId: string, toRoleId: string): Promise<void>;
}
