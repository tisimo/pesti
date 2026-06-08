export type VerificationDataPersistence = {
  verificationId: string;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  gender?: string;
  country?: string;
  documentType?: string;
  createdAt: Date;
  updatedAt: Date;
};
