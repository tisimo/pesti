import { PermissionApplication, PermissionCategory, PermissionStatus } from "../domain/Permission";

export default interface IPermissionDTO {
  id: string;
  name: string;
  status: PermissionStatus;
  category: PermissionCategory;
  application: PermissionApplication;
}
