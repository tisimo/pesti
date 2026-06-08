import { useEffect, useMemo, useRef, useState } from "react";
import { apiBackoffice } from "@/shared/lib/axios";
import { RolesService, type AdminUserSummary } from "@/features/roles/api/RolesService";
import { useAuth } from "@/app/providers/AuthProvider";
import "./emailInboxPage.css";

type EmailStatus = "UNREAD" | "READ" | "REPLIED" | "ARCHIVED";

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  sentAt: string;
  bodyHtml: string;
  attachments?: string[];
}

interface EmailThread {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  status: EmailStatus;
  accountId: string;
  userType: string;
  messages: EmailMessage[];
  assignedTo?: string | null;
}

const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL || "support@onlyhighiq.com").toLowerCase();
const OPENED_THREADS_STORAGE_KEY = "bo_email_opened_threads";
const REPLY_DRAFTS_STORAGE_KEY = "bo_email_reply_drafts";
const THREAD_ASSIGNMENTS_STORAGE_KEY = "bo_email_thread_assignments";
const THREAD_ASSIGNMENT_NOTIFICATIONS_STORAGE_KEY = "bo_email_thread_assignment_notifications";
const THREAD_ASSIGNMENT_NOTIFICATIONS_CHANGED_EVENT = "bo-email-thread-assignment-notifications-changed";

const STATUS_TONE: Record<EmailStatus, "danger" | "warning" | "success" | "neutral"> = {
  UNREAD: "danger",
  READ: "neutral",
  REPLIED: "success",
  ARCHIVED: "neutral",
};

const INITIAL_THREADS: EmailThread[] = [];

const TEMPLATE_LIBRARY = [
  {
    id: "tpl-1",
    label: "Payment delay",
    body: "Thanks for reaching out. Our team is reviewing the payment status and will update you within 24 hours.",
  },
  {
    id: "tpl-2",
    label: "KYC follow-up",
    body: "We are reviewing your KYC submission. If we need more information, we will reach out shortly.",
  },
  {
    id: "tpl-3",
    label: "General acknowledgment",
    body: "Thanks for your message. We have received your request and will respond soon.",
  },
];

function formatDate(value: string) {
  const date = new Date(value);
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function hashContent(input: string | null | undefined) {
  const safeInput = input ?? "";
  let hash = 0;
  for (let i = 0; i < safeInput.length; i += 1) {
    hash = (hash * 31 + safeInput.charCodeAt(i)) % 1_000_000_007;
  }
  return `h-${hash.toString(16)}`;
}

function getStoredOpenedThreadIds(): string[] {
  try {
    const raw = localStorage.getItem(OPENED_THREADS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function getStoredReplyDrafts(): Record<string, { bodyHtml: string; savedAt: string }> {
  try {
    const raw = localStorage.getItem(REPLY_DRAFTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getStoredThreadAssignments(): Record<string, string> {
  try {
    const raw = localStorage.getItem(THREAD_ASSIGNMENTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function saveThreadAssignment(threadId: string, userId: string | null): void {
  const assignments = getStoredThreadAssignments();

  if (!userId) {
    delete assignments[threadId];
  } else {
    assignments[threadId] = userId;
  }

  localStorage.setItem(THREAD_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
}

function getStoredThreadAssignmentNotifications(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(THREAD_ASSIGNMENT_NOTIFICATIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};

    return Object.fromEntries(
      Object.entries(parsed).map(([userId, threadIds]) => [
        userId,
        Array.isArray(threadIds) ? threadIds.filter((threadId) => typeof threadId === "string" && threadId.trim()) : [],
      ]),
    );
  } catch {
    return {};
  }
}

function persistThreadAssignmentNotifications(notifications: Record<string, string[]>): void {
  localStorage.setItem(THREAD_ASSIGNMENT_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event(THREAD_ASSIGNMENT_NOTIFICATIONS_CHANGED_EVENT));
}

function addThreadAssignmentNotification(userId: string, threadId: string): void {
  const notifications = getStoredThreadAssignmentNotifications();
  const current = notifications[userId] ?? [];
  if (!current.includes(threadId)) {
    notifications[userId] = [...current, threadId];
    persistThreadAssignmentNotifications(notifications);
  }
}

function removeThreadAssignmentNotification(userId: string, threadId: string): void {
  const notifications = getStoredThreadAssignmentNotifications();
  const current = notifications[userId] ?? [];
  const next = current.filter((id) => id !== threadId);
  if (next.length === current.length) return;

  if (next.length) {
    notifications[userId] = next;
  } else {
    delete notifications[userId];
  }
  persistThreadAssignmentNotifications(notifications);
}

function clearThreadAssignmentNotifications(userId: string): void {
  const notifications = getStoredThreadAssignmentNotifications();
  if (!(userId in notifications)) return;
  delete notifications[userId];
  persistThreadAssignmentNotifications(notifications);
}

function applyStoredThreadAssignments(threads: EmailThread[]): EmailThread[] {
  const assignments = getStoredThreadAssignments();
  return threads.map((thread) => {
    const assignedTo = assignments[thread.id];
    return assignedTo === undefined ? thread : { ...thread, assignedTo };
  });
}

function saveReplyDraft(threadId: string, bodyHtml: string): string | null {
  const trimmed = bodyHtml.trim();
  const drafts = getStoredReplyDrafts();

  if (!trimmed) {
    delete drafts[threadId];
    localStorage.setItem(REPLY_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    return null;
  }

  const savedAt = new Date().toISOString();
  drafts[threadId] = { bodyHtml, savedAt };
  localStorage.setItem(REPLY_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  return savedAt;
}

function clearReplyDraft(threadId: string): void {
  const drafts = getStoredReplyDrafts();
  if (!drafts[threadId]) return;
  delete drafts[threadId];
  localStorage.setItem(REPLY_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

function getThreadUiStatus(thread: EmailThread, openedThreadIds: string[]): EmailStatus {
  if (thread.status === "ARCHIVED" || thread.status === "REPLIED") {
    return thread.status;
  }

  return openedThreadIds.includes(thread.id) ? "READ" : "UNREAD";
}

function isInitiallySentToSupport(thread: EmailThread): boolean {
  if (!Array.isArray(thread.messages) || thread.messages.length === 0) {
    return false;
  }

  const firstMessage = [...thread.messages].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt))[0];
  return (firstMessage?.to || "").trim().toLowerCase() === SUPPORT_EMAIL;
}

function formatThreadSubject(subject?: string | null): string {
  const trimmed = (subject ?? "").trim();
  if (!trimmed || /^re:?\s*$/i.test(trimmed)) return "No subject";
  return trimmed;
}

function parseRecipients(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function stripReplyQuotedBlock(html: string): string {
  if (!html) return html;

  const normalized = html
    .replace(/<hr[^>]*>\s*(?:<[^>]+>\s*){0,6}(?:<strong>|<b>)?\s*From:\s*[\s\S]*$/i, "")
    .replace(/(?:<br\s*\/?>\s*){1,4}(?:<strong>|<b>)?\s*From:\s*[\s\S]*$/i, "")
    .replace(/\n\s*From:\s*[\s\S]*$/i, "");

  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(normalized, "text/html");
      const fullText = (doc.body.textContent ?? "").toLowerCase();
      const hasReplyHeaderTriplet = fullText.includes("from:") && fullText.includes("sent:") && fullText.includes("to:");

      if (hasReplyHeaderTriplet) {
        const marker = Array.from(doc.body.querySelectorAll("*"))
          .find((el) => (el.textContent ?? "").trim().toLowerCase().startsWith("from:"));

        if (marker) {
          const block = marker.closest("div, p, table, tr, td, section") ?? marker;
          const parent = block.parentNode;

          if (parent) {
            const previous = block.previousSibling;
            if (previous && previous.nodeType === Node.ELEMENT_NODE && (previous as Element).tagName.toLowerCase() === "hr") {
              parent.removeChild(previous);
            }

            let cursor: ChildNode | null = block;
            while (cursor) {
              const next: ChildNode | null = cursor.nextSibling;
              parent.removeChild(cursor);
              cursor = next;
            }

            return doc.body.innerHTML.trim();
          }
        }
      }
    } catch {
      // Keep regex fallback when DOM parsing fails.
    }
  }

  return normalized.trim();
}

export default function EmailInboxPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "Super Admin";
  const currentAdminId = user?.boUserId ?? "";

  const [threads, setThreads] = useState<EmailThread[]>(INITIAL_THREADS);
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_THREADS[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmailStatus | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [bcc, setBcc] = useState("");
  const [showBcc, setShowBcc] = useState(false);
  const [replyHtml, setReplyHtml] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUserSummary[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSelection, setAssignSelection] = useState("");
  const [openedThreadIds, setOpenedThreadIds] = useState<string[]>(() => getStoredOpenedThreadIds());
  const [draftStorageRevision, setDraftStorageRevision] = useState(0);
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);

  const adminLabelMap = useMemo(() => {
    return new Map(
      adminUsers.map((user) => {
        const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        return [user.userId, displayName || user.email];
      }),
    );
  }, [adminUsers]);
  const draftThreadIds = useMemo(() => {
    void draftStorageRevision;
    const drafts = getStoredReplyDrafts();
    return new Set(
      Object.entries(drafts)
        .filter(([threadId, draft]) => Boolean(threadId) && Boolean(draft?.bodyHtml?.trim()) && threads.some((thread) => thread.id === threadId))
        .map(([threadId]) => threadId),
    );
  }, [threads, draftStorageRevision]);
  const stats = useMemo(() => {
    const supportThreads = threads.filter((thread) => isInitiallySentToSupport(thread));
    const scopedThreads = isSuperAdmin
      ? supportThreads
      : supportThreads.filter((thread) => thread.assignedTo === currentAdminId);
    const total = scopedThreads.length;
    const unread = scopedThreads.filter((thread) => getThreadUiStatus(thread, openedThreadIds) === "UNREAD").length;
    const assigned = scopedThreads.filter((thread) => thread.assignedTo).length;
    const archived = scopedThreads.filter((thread) => getThreadUiStatus(thread, openedThreadIds) === "ARCHIVED").length;
    return { total, unread, assigned, archived };
  }, [threads, isSuperAdmin, currentAdminId, openedThreadIds]);

  useEffect(() => {
    localStorage.setItem(OPENED_THREADS_STORAGE_KEY, JSON.stringify(openedThreadIds));
  }, [openedThreadIds]);

  useEffect(() => {
    if (!currentAdminId) return;
    clearThreadAssignmentNotifications(currentAdminId);
  }, [currentAdminId]);

  useEffect(() => {
    const activeThread = threads.find((thread) => thread.id === selectedId) ?? null;

    if (!activeThread) {
      setReplyHtml("");
      setDraftSavedAt(null);
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      return;
    }

    const draft = getStoredReplyDrafts()[activeThread.id];
    const bodyHtml = draft?.bodyHtml ?? "";
    setReplyHtml(bodyHtml);
    setDraftSavedAt(draft?.savedAt ?? null);

    if (editorRef.current) {
      editorRef.current.innerHTML = bodyHtml;
    }
  }, [selectedId, threads]);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    apiBackoffice
      .get<{ items: EmailThread[] }>("/admin/email")
      .then((res) => {
        const next = applyStoredThreadAssignments(res.data.items ?? []);
        setThreads(next);
        setSelectedId(next[0]?.id ?? null);
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message ?? "Failed to load inbox.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setAdminUsersLoading(true);
    setAdminUsersError("");
    Promise.all([RolesService.getAdminUsers(), RolesService.getRoles()])
      .then(([users, allRoles]) => {
        const roleMap = Object.fromEntries(allRoles.map((r) => [r.roleId, r]));
        const backofficeUsers = users.filter((u) => {
          const roleIds = u.roleIds ?? (u.roleId ? [u.roleId] : []);
          return roleIds.some((roleId) => roleMap[roleId]?.application === "backoffice") && u.status === "ACTIVE";
        });
        setAdminUsers(backofficeUsers);
      })
      .catch((err) => {
        setAdminUsersError(err?.response?.data?.message ?? "Failed to load users.");
      })
      .finally(() => setAdminUsersLoading(false));
  }, []);

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      if (!isInitiallySentToSupport(thread)) {
        return false;
      }

      if (!isSuperAdmin && thread.assignedTo !== currentAdminId) {
        return false;
      }

      if (isSuperAdmin && assignTo && thread.assignedTo !== assignTo) {
        return false;
      }

      if (showDraftsOnly && !draftThreadIds.has(thread.id)) {
        return false;
      }

      const threadStatus = getThreadUiStatus(thread, openedThreadIds);
      const from = (thread.from ?? "").toLowerCase();
      const subject = formatThreadSubject(thread.subject).toLowerCase();
      const matchesSearch = from.includes(search.toLowerCase()) || subject.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || threadStatus === statusFilter;
      const receivedAt = thread.receivedAt ?? "";
      const withinFrom = dateFrom ? new Date(receivedAt) >= new Date(dateFrom) : true;
      const withinTo = dateTo ? new Date(receivedAt) <= new Date(`${dateTo}T23:59:59`) : true;
      if (showArchived) {
        return threadStatus === "ARCHIVED" && matchesSearch && withinFrom && withinTo;
      }
      if (threadStatus === "ARCHIVED") return false;
      return matchesSearch && matchesStatus && withinFrom && withinTo;
    });
  }, [threads, isSuperAdmin, currentAdminId, assignTo, openedThreadIds, search, statusFilter, dateFrom, dateTo, showArchived, showDraftsOnly, draftThreadIds]);

  const selectedThread = filteredThreads.find((thread) => thread.id === selectedId) ?? null;
  const selectedMessages = selectedThread?.messages ?? [];

  useEffect(() => {
    if (!filteredThreads.length) {
      setSelectedId(null);
      return;
    }

    const stillVisible = filteredThreads.some((thread) => thread.id === selectedId);
    if (!stillVisible) {
      setSelectedId(filteredThreads[0]?.id ?? null);
    }
  }, [filteredThreads, selectedId]);

  function toggleSelection(threadId: string) {
    setSelectedIds((prev) =>
      prev.includes(threadId) ? prev.filter((id) => id !== threadId) : [...prev, threadId],
    );
  }

  function selectThread(threadId: string) {
    // Selecting (expanding) a thread via row click should mark it as read (add to openedThreadIds).
    // Selecting via checkbox should not (checkbox handlers stop propagation).
    setSelectedId(threadId);
    setOpenedThreadIds((prev) => (prev.includes(threadId) ? prev : [...prev, threadId]));
  }

  function applyBulkStatus(status: EmailStatus) {
    // If no explicit checkbox selection is made, apply action to the currently opened thread
    const targets = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
    if (!targets.length) return;

    setThreads((prev) => prev.map((thread) => (targets.includes(thread.id) ? { ...thread, status } : thread)));

    if (status === "READ") {
      setOpenedThreadIds((prev) => [...new Set([...prev, ...targets])]);
    }

    if (status === "UNREAD") {
      setOpenedThreadIds((prev) => prev.filter((id) => !targets.includes(id)));
    }

    // Clear checkbox selection after bulk action, but keep the opened thread selected
    setSelectedIds([]);
  }

  function deleteSelected() {
    if (!selectedIds.length) return;
    setThreads((prev) => prev.filter((thread) => !selectedIds.includes(thread.id)));
    setSelectedIds([]);
  }

  function archiveSelected() {
    if (!selectedIds.length) return;
    setThreads((prev) =>
      prev.map((thread) =>
        selectedIds.includes(thread.id) ? { ...thread, status: "ARCHIVED" } : thread,
      ),
    );
    setSelectedIds([]);
  }

  function unarchiveSelected() {
    if (!selectedIds.length) return;
    setThreads((prev) =>
      prev.map((thread) =>
        selectedIds.includes(thread.id) ? { ...thread, status: "READ" } : thread,
      ),
    );
    setSelectedIds([]);
  }


  function assignCurrentThread(userId: string | null) {
    if (!isSuperAdmin) return;
    if (!selectedThread) return;
    const assignedTo = userId && userId.trim() ? userId : null;
    const previousAssignedTo = selectedThread.assignedTo?.trim() || null;
    saveThreadAssignment(selectedThread.id, assignedTo);
    if (previousAssignedTo && previousAssignedTo !== assignedTo) {
      removeThreadAssignmentNotification(previousAssignedTo, selectedThread.id);
    }
    if (assignedTo) {
      addThreadAssignmentNotification(assignedTo, selectedThread.id);
    }
    setThreads((prev) =>
      prev.map((thread) => (thread.id === selectedThread.id ? { ...thread, assignedTo } : thread)),
    );
  }

  function confirmAssign() {
    const userId = assignSelection === "__none__" ? null : assignSelection;
    if (!userId && assignSelection !== "__none__") return;
    assignCurrentThread(userId);
    setShowAssignModal(false);
    setAssignSelection("");
  }

  function applyTemplate(templateId: string) {
    const template = TEMPLATE_LIBRARY.find((tpl) => tpl.id === templateId);
    if (!template) return;
    setReplyHtml(template.body);
    if (editorRef.current) {
      editorRef.current.innerHTML = template.body;
    }
  }

  function handleEditorCommand(command: "bold" | "italic" | "underline") {
    document.execCommand(command, false);
    if (editorRef.current) {
      setReplyHtml(editorRef.current.innerHTML);
    }
  }

  function handleAttachmentChange(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files);
    const oversized = next.find((file) => file.size > 5 * 1024 * 1024);
    if (oversized) return;
    setAttachments(next);
  }

  function saveDraft() {
    if (!selectedThread) return;
    const savedAt = saveReplyDraft(selectedThread.id, replyHtml);
    setDraftSavedAt(savedAt);
    setDraftStorageRevision((prev) => prev + 1);
  }

  function handleReplyInput(value: string) {
    setReplyHtml(value);
    if (!selectedThread) return;
    const savedAt = saveReplyDraft(selectedThread.id, value);
    setDraftSavedAt(savedAt);
    setDraftStorageRevision((prev) => prev + 1);
  }

  function getReplyRecipient(thread: EmailThread): string {
    const supportMailbox = SUPPORT_EMAIL;
    const firstNonSupport = [...thread.messages]
      .sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt))
      .find((message) => (message.from || "").trim().toLowerCase() !== supportMailbox);

    return firstNonSupport?.from || thread.from;
  }

  async function sendReply() {
    if (!selectedThread || replySending) return;
    const cleanReply = replyHtml.trim();
    if (!cleanReply) return;
    setReplySending(true);
    setReplyError("");

    try {
      await apiBackoffice.post(`/admin/email/${selectedThread.id}/reply`, {
        message: cleanReply,
        cc: parseRecipients(cc),
        bcc: parseRecipients(bcc),
      });

      const reply: EmailMessage = {
        id: `m-${Date.now()}`,
        from: SUPPORT_EMAIL,
        to: getReplyRecipient(selectedThread),
        sentAt: new Date().toISOString(),
        bodyHtml: cleanReply,
        attachments: attachments.map((file) => file.name),
      };

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === selectedThread.id
            ? {
                ...thread,
                status: "REPLIED",
                messages: [...thread.messages, reply],
              }
            : thread,
        ),
      );
      clearReplyDraft(selectedThread.id);
      setDraftStorageRevision((prev) => prev + 1);
      setReplyHtml("");
      setAttachments([]);
      setDraftSavedAt(null);
      setCc("");
      setBcc("");
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setReplyError(error?.response?.data?.message ?? "Failed to send reply.");
    } finally {
      setReplySending(false);
    }
  }

  return (
    <div className="email-inbox-page">
      <div className="admin-page-header email-inbox-page__header">
        <div className="email-inbox-page__header-top">
          <div className="email-inbox-page__header-intro">
            <h1>Email Inbox</h1>
            <p>Unified support inbox for support@onlyjustcauses.com with assignment, replies, and audit history.</p>
          </div>
        </div>
        <div className="email-inbox-page__header-meta">
          <div className="email-inbox-page__metric">
            <span className="email-inbox-page__metric-label">Total threads</span>
            <strong className="email-inbox-page__metric-value">{stats.total.toLocaleString()}</strong>
          </div>
          <div className="email-inbox-page__metric">
            <span className="email-inbox-page__metric-label">Unread</span>
            <strong className="email-inbox-page__metric-value">{stats.unread.toLocaleString()}</strong>
          </div>
          <div className="email-inbox-page__metric">
            <span className="email-inbox-page__metric-label">{isSuperAdmin ? "Assigned" : "My threads"}</span>
            <strong className="email-inbox-page__metric-value">{stats.assigned.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <section className="email-inbox-page__toolbar">
        <div className="email-inbox-page__filters">
          <label className="email-inbox-page__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              placeholder="Search sender or subject"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="email-inbox-page__input"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EmailStatus | "ALL")}
            className="email-inbox-page__select"
            disabled={showArchived}
          >
            <option value="ALL">All status</option>
            <option value="UNREAD">Unread</option>
            <option value="READ">Read</option>
            <option value="REPLIED">Replied</option>
          </select>
          {isSuperAdmin ? (
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="email-inbox-page__select"
            >
              <option value="">No assignment</option>
              {adminUsersLoading ? (
                <option value="" disabled>Loading users...</option>
              ) : null}
              {!adminUsersLoading && adminUsersError ? (
                <option value="" disabled>{adminUsersError}</option>
              ) : null}
              {!adminUsersLoading && !adminUsersError && adminUsers.length === 0 ? (
                <option value="" disabled>No active users</option>
              ) : null}
              {adminUsers.map((user) => {
                const label = adminLabelMap.get(user.userId) ?? user.email;
                return (
                  <option key={user.userId} value={user.userId}>
                    {label}
                  </option>
                );
              })}
            </select>
          ) : null}
          <label className="email-inbox-page__date-filter">
            <span>From</span>
            <input
              type="date"
              lang="en-GB"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="email-inbox-page__input"
            />
          </label>
          <label className="email-inbox-page__date-filter">
            <span>To</span>
            <input
              type="date"
              lang="en-GB"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="email-inbox-page__input"
            />
          </label>
        </div>

        <div className="email-inbox-page__toolbar-actions">
          <button type="button" onClick={() => applyBulkStatus("READ")} className="email-inbox-page__chip">
            Mark read
          </button>
          <button type="button" onClick={() => applyBulkStatus("UNREAD")} className="email-inbox-page__chip">
            Mark unread
          </button>
          <button
            type="button"
            onClick={showArchived ? unarchiveSelected : archiveSelected}
            className="email-inbox-page__chip"
          >
            {showArchived ? "Remove from archive" : "Archive"}
          </button>
          <button type="button" onClick={deleteSelected} className="email-inbox-page__chip email-inbox-page__chip--danger">
            Delete
          </button>
          <button
            type="button"
            onClick={() => setShowDraftsOnly((prev) => !prev)}
            className={`email-inbox-page__chip ${showDraftsOnly ? "email-inbox-page__chip--active" : "email-inbox-page__chip--muted"}`}
          >
            Drafts ({draftThreadIds.size})
          </button>
          {selectedIds.length > 0 ? (
            <span className="email-inbox-page__selection-meta">{selectedIds.length} selected</span>
          ) : null}
        </div>
      </section>

      <div className="email-inbox-page__grid">
        <section className="email-inbox-page__panel email-inbox-page__thread-list">
          <div className="email-inbox-page__panel-header">
            <div>
              <h3>Inbox threads</h3>
              <span>{filteredThreads.length.toLocaleString()} conversations</span>
            </div>
            <div className="email-inbox-page__panel-meta">
              <button
                type="button"
                className="email-inbox-page__chip email-inbox-page__chip--muted"
                onClick={() => setShowArchived((prev) => !prev)}
              >
                {showArchived ? "Back to inbox" : `View archived (${stats.archived})`}
              </button>
            </div>
          </div>

          <div className="email-inbox-page__thread-list-body">
            {filteredThreads.map((thread) => {
              const threadStatus = getThreadUiStatus(thread, openedThreadIds);
              const assignedLabel = thread.assignedTo
                ? adminLabelMap.get(thread.assignedTo) ?? thread.assignedTo
                : "Unassigned";

              const displayFrom = thread.from || "Unknown sender";
              const displaySubject = formatThreadSubject(thread.subject);
              const displayReceivedAt = thread.receivedAt || new Date().toISOString();

              return (
                <div
                  key={thread.id}
                  onClick={() => selectThread(thread.id)}
                  className={`email-inbox-page__thread ${selectedId === thread.id ? "email-inbox-page__thread--active" : ""}`}
                >
                  <div
                    className="email-inbox-page__thread-select"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(thread.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelection(thread.id);
                      }}
                    />
                  </div>
                  <div className="email-inbox-page__thread-main">
                    <div className="email-inbox-page__thread-top">
                      <div className="email-inbox-page__thread-from">
                        {threadStatus === "UNREAD" ? <span className="email-inbox-page__thread-dot" /> : null}
                        <span>{displayFrom}</span>
                        {draftThreadIds.has(thread.id) ? <span className="email-inbox-page__draft-badge">Draft</span> : null}
                      </div>
                      <span className={`email-inbox-page__status email-inbox-page__status--${STATUS_TONE[threadStatus]}`}>
                        {threadStatus}
                      </span>
                    </div>
                    <div className="email-inbox-page__thread-subject">{displaySubject}</div>
                    <div className="email-inbox-page__thread-meta">
                      <span>{thread.assignedTo ? `Assigned to ${assignedLabel}` : "Unassigned"}</span>
                      <span>{formatShortDate(displayReceivedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && <div className="email-inbox-page__state">Loading inbox...</div>}
            {!loading && loadError && (
              <div className="email-inbox-page__state email-inbox-page__state--error">{loadError}</div>
            )}
            {!loading && !loadError && filteredThreads.length === 0 && (
              <div className="email-inbox-page__state">No emails match the filters.</div>
            )}
          </div>
        </section>

        <div className="email-inbox-page__detail">
          <section className="email-inbox-page__panel">
            {selectedThread ? (
              <>
                <div className="email-inbox-page__thread-header">
                  <div>
                    <h2>{formatThreadSubject(selectedThread.subject)}</h2>
                    <p>From {selectedThread.from || "Unknown sender"}</p>
                  </div>
                  <div className="email-inbox-page__thread-date" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <div>{formatDate(selectedThread.receivedAt || new Date().toISOString())}</div>
                    <div style={{ fontSize: "0.9rem", marginTop: "0.5rem", color: "#64748b" }}>
                      {selectedThread.assignedTo
                        ? `Assigned to ${adminLabelMap.get(selectedThread.assignedTo) ?? selectedThread.assignedTo}`
                        : "Unassigned"}
                    </div>
                  </div>
                </div>

                <div className="email-inbox-page__messages">
                  {selectedMessages.map((msg) => {
                    const outbound = msg.from === SUPPORT_EMAIL;
                    return (
                      <div
                        key={msg.id}
                        className={`email-inbox-page__message ${outbound ? "email-inbox-page__message--outbound" : ""}`}
                      >
                        <div className="email-inbox-page__message-meta">
                          <div className="email-inbox-page__message-from">{msg.from || "Unknown sender"}</div>
                          <div className="email-inbox-page__message-date">
                            {formatDate(msg.sentAt || new Date().toISOString())}
                          </div>
                        </div>
                        <div
                          className="email-inbox-page__message-body"
                          dangerouslySetInnerHTML={{ __html: stripReplyQuotedBlock(msg.bodyHtml || "") }}
                        />
                        {msg.attachments?.length ? (
                          <div className="email-inbox-page__attachments">
                            {msg.attachments.map((file) => (
                              <span key={file} className="email-inbox-page__attachment">
                                {file}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="email-inbox-page__empty-state">Select an email thread to view.</div>
            )}
          </section>

          <section className="email-inbox-page__panel">
            <div className="email-inbox-page__reply-header">
              <div>
                <h3>Reply</h3>
                <span>Use formatting and templates to answer quickly.</span>
              </div>
              <div className="email-inbox-page__reply-actions">
                <button type="button" onClick={() => handleEditorCommand("bold")} className="email-inbox-page__chip">
                  B
                </button>
                <button type="button" onClick={() => handleEditorCommand("italic")} className="email-inbox-page__chip">
                  I
                </button>
                <button type="button" onClick={() => handleEditorCommand("underline")} className="email-inbox-page__chip">
                  U
                </button>
              </div>
            </div>

            <div className="email-inbox-page__reply-options">
              <button type="button" onClick={() => setShowCc((prev) => !prev)} className="email-inbox-page__chip email-inbox-page__chip--muted">
                {showCc ? "Hide CC" : "Add CC"}
              </button>
              <button
                type="button"
                onClick={() => setShowBcc((prev) => !prev)}
                className="email-inbox-page__chip email-inbox-page__chip--muted"
              >
                {showBcc ? "Hide BCC" : "Add BCC"}
              </button>
            </div>

            {replyError ? <div className="email-inbox-page__state email-inbox-page__state--error">{replyError}</div> : null}

            {showCc ? (
              <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="CC (comma separated)" className="email-inbox-page__input" />
            ) : null}
            {showBcc ? (
              <input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="BCC (comma separated)" className="email-inbox-page__input" />
            ) : null}
            <div
              className="email-inbox-page__editor"
              ref={editorRef}
              contentEditable
              onInput={(e) => handleReplyInput((e.target as HTMLDivElement).innerHTML)}
            />

            <div className="email-inbox-page__attachments-row">
              <label className="email-inbox-page__attachment-label">
                Attachments (max 5MB)
                <input type="file" multiple onChange={(e) => handleAttachmentChange(e.target.files)} />
              </label>
              {attachments.length > 0 && (
                <div className="email-inbox-page__attachments">
                  {attachments.map((file) => (
                    <span key={file.name} className="email-inbox-page__attachment email-inbox-page__attachment--muted">
                      {file.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="email-inbox-page__reply-footer">
              <select onChange={(e) => applyTemplate(e.target.value)} defaultValue="" className="email-inbox-page__select">
                <option value="" disabled>
                  Select canned response
                </option>
                {TEMPLATE_LIBRARY.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={saveDraft} className="email-inbox-page__chip">
                Save draft
              </button>
              {isSuperAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setAssignSelection("");
                    setShowAssignModal(true);
                  }}
                  className="email-inbox-page__chip email-inbox-page__chip--muted"
                  disabled={!selectedThread}
                >
                  Assign to
                </button>
              ) : null}
              <button type="button" onClick={sendReply} className="email-inbox-page__primary-button" disabled={replySending}>
                {replySending ? "Sending…" : "Send reply"}
              </button>
              {draftSavedAt && (
                <span className="email-inbox-page__draft-meta">Draft saved {formatShortDate(draftSavedAt)}</span>
              )}
            </div>
          </section>

          <section className="email-inbox-page__panel">
            <div className="email-inbox-page__panel-header">
              <div>
                <h3>Activity log</h3>
                <span>Responder ID, timestamps, and content hash.</span>
              </div>
            </div>
            {selectedThread ? (
              <div className="email-inbox-page__activity-list">
                {selectedMessages.map((msg) => (
                  <div key={`${msg.id}-log`}>
                    {msg.from === SUPPORT_EMAIL ? `Responder ID: ${SUPPORT_EMAIL}` : `User: ${msg.from}`} |{" "}
                    {formatDate(msg.sentAt || new Date().toISOString())} | {hashContent(msg.bodyHtml)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="email-inbox-page__empty-state">Select a thread to view log entries.</div>
            )}
          </section>
        </div>
      </div>

      {isSuperAdmin && showAssignModal ? (
        <div className="email-inbox-page__modal-backdrop" role="presentation" onClick={() => setShowAssignModal(false)}>
          <div
            className="email-inbox-page__modal"
            role="dialog"
            aria-modal="true"
            aria-label="Assign thread"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="email-inbox-page__modal-header">
              <div>
                <h3>Assign thread</h3>
                <span>Select a backoffice user to own this conversation.</span>
              </div>
            </div>
            <div className="email-inbox-page__modal-body">
              <select
                value={assignSelection}
                onChange={(e) => setAssignSelection(e.target.value)}
                className="email-inbox-page__select"
              >
                <option value="" disabled>Select user</option>
                <option value="__none__">None</option>
                {adminUsersLoading ? (
                  <option value="" disabled>Loading users...</option>
                ) : null}
                {!adminUsersLoading && adminUsersError ? (
                  <option value="" disabled>{adminUsersError}</option>
                ) : null}
                {!adminUsersLoading && !adminUsersError && adminUsers.length === 0 ? (
                  <option value="" disabled>No active users</option>
                ) : null}
                {adminUsers.map((user) => {
                  const label = adminLabelMap.get(user.userId) ?? user.email;
                  return (
                    <option key={user.userId} value={user.userId}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="email-inbox-page__modal-footer">
              <button type="button" className="email-inbox-page__chip" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="email-inbox-page__primary-button"
                onClick={confirmAssign}
                disabled={!assignSelection}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
