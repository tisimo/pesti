import { Mapper } from "../core/infra/Mapper";
import User, { UserStatus } from "../domain/User";
import IUserDTO from "../dto/IUserDTO";

interface UserPersistence {
  userId: string;
  cognitoSub?: string;
  email: string;
  roleId?: string;
  roleIds?: string[];
  status: UserStatus;
  firstName?: string;
  lastName?: string;
}

export default class UserMapper extends Mapper<User> {
  public static toDTO(User: User): IUserDTO {
    return {
      userId: User.userId,
      cognitoSub: User.cognitoSub,
      email: User.email,
      ...(User.roleId ? { roleId: User.roleId } : {}),
      roleIds: User.roleIds,
      status: User.status,
      firstName: User.firstName,
      lastName: User.lastName,
    };
  }

  public static toDomain(raw: UserPersistence): User {
    const roleIds = Array.isArray(raw.roleIds)
      ? raw.roleIds
      : raw.roleId
        ? [raw.roleId]
        : [];

    return User.create({
      userId: raw.userId,
      cognitoSub: raw.cognitoSub,
      email: raw.email,
      roleIds,
      firstName: raw.firstName,
      lastName: raw.lastName,
      status: (raw.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
    });
  }

  public static toPersistence(User: User): UserPersistence {
    return {
      userId: User.userId,
      email: User.email,
      roleIds: User.roleIds,
      status: User.status,
      ...(User.roleId ? { roleId: User.roleId } : {}),
      ...(User.cognitoSub ? { cognitoSub: User.cognitoSub } : {}),
      ...(User.firstName ? { firstName: User.firstName } : {}),
      ...(User.lastName ? { lastName: User.lastName } : {}),
    };
  }
}
