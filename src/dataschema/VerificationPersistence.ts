export type VerificationPersistence = {
  verificationId: string;
  accountId: string;
  status: string;
  veriffSessionId?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
