import { useEffect, useState } from "react";
import {
  API_ACCESS_DENIED_EVENT,
  type ApiAccessDeniedEventDetail,
} from "@/shared/lib/apiErrors";
import "./apiAccessDeniedToast.css";

export default function ApiAccessDeniedToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: number | undefined;
    let lastMessage = "";
    let lastShownAt = 0;

    function handleAccessDenied(event: Event) {
      const detail = (event as CustomEvent<ApiAccessDeniedEventDetail>).detail;
      const nextMessage = detail?.message;
      if (!nextMessage) return;

      const now = Date.now();
      if (nextMessage === lastMessage && now - lastShownAt < 1500) return;

      lastMessage = nextMessage;
      lastShownAt = now;
      setMessage(nextMessage);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setMessage(null), 6500);
    }

    window.addEventListener(API_ACCESS_DENIED_EVENT, handleAccessDenied);
    return () => {
      window.removeEventListener(API_ACCESS_DENIED_EVENT, handleAccessDenied);
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="api-access-denied-toast" role="alert" aria-live="assertive">
      <div className="api-access-denied-toast__icon">
        <i className="bi bi-shield-lock" />
      </div>
      <div>
        <div className="api-access-denied-toast__title">Access not available</div>
        <div className="api-access-denied-toast__message">{message}</div>
      </div>
      <button
        type="button"
        className="api-access-denied-toast__close"
        aria-label="Dismiss access message"
        onClick={() => setMessage(null)}
      >
        <i className="bi bi-x-lg" />
      </button>
    </div>
  );
}
