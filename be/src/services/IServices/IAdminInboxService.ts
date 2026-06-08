export type AdminEmailMessage = {
  id: string;
  from: string;
  to: string;
  sentAt: string;
  bodyHtml: string;
  attachments: string[];
};

export type AdminEmailThread = {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  status: "UNREAD" | "READ";
  messages: AdminEmailMessage[];
};

export default interface IAdminInboxService {
  listThreads(limit?: number): Promise<AdminEmailThread[]>;
  getThreadById(threadId: string): Promise<AdminEmailThread | null>;
}
