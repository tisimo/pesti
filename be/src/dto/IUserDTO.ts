export default interface IUserDTO {
  userId: string;
  cognitoSub?: string;
  email: string;
  roleId?: string;
  roleIds: string[];
  firstName?: string;
  lastName?: string;
  status: "ACTIVE" | "INACTIVE";
  cognitoStatus?: string;
}
