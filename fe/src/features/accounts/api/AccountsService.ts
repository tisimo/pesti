import { apiShared } from "@/shared/lib/axios";
import { Account } from "@/features/accounts/model/Account";

export async function createAccount(cognitoSub: string, email: string): Promise<Account> {
    const payload = { cognitoSub, email };
    const { data } = await apiShared.post<Account>("/accounts", payload);
    return data;
}

export async function getAccountByCognitoSub(cognitoSub: string): Promise<Account> {
    const encoded = encodeURIComponent(cognitoSub);
    const { data } = await apiShared.get<Account>(`/accounts/by-cognito-sub/${encoded}`);
    return data;
}

export async function createAccountOAuth(cognitoSub: string, email: string): Promise<Account> {
    const payload = { cognitoSub, email };
    const { data } = await apiShared.post<Account>('/accounts/oauth', payload);
    return data;
}
