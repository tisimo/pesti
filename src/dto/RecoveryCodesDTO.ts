export type RecoveryCodesDTO = {
  cognitoSub: string;
  recoveryCodes: string[];
};

export type RecoveryCodeDTO = {
  cognitoSub: string;
  recoveryCode: string;
};
