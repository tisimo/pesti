export interface CreateAccountCognitoInput {
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface CreateAccountCognitoResult {
  userId: string;
  cognitoSub?: string;
  email: string;
  roleId?: string;
  roleIds: string[];
  status: "ACTIVE" | "INACTIVE";
  firstName?: string;
  lastName?: string;
}

export default interface IAccountCognitoService {
  create(input: CreateAccountCognitoInput): Promise<CreateAccountCognitoResult>;
  list(): Promise<any[]>;
  resetPassword(email: string): Promise<void>;
}
