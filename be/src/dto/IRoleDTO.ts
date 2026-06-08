export default interface IRoleDTO {
  roleId: string;
  name: string;
  description?: string;
  permissions: string[];
  status: "ACTIVE" | "INACTIVE";
  application: string;
  isDefault: boolean;
}
