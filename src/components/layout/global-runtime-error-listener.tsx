"use client";

import { useEffect } from "react";

const RUNTIME_PANEL_ID = "global-runtime-error-panel";
const MESSAGE_ID = "global-runtime-error-message";
const STACK_ID = "global-runtime-error-stack";

function revealRuntimeError(errorLike: unknown) {
  if (typeof document === "undefined") {
    return;
  }

  const panel = document.getElementById(RUNTIME_PANEL_ID);
  const message = document.getElementById(MESSAGE_ID);
  const stack = document.getElementById(STACK_ID);

  if (!panel || !message || !stack) {
    return;
  }

  const error = errorLike instanceof Error ? errorLike : undefined;
  const messageText =
    typeof errorLike === "string"
      ? errorLike
      : typeof error?.message === "string" && error.message.trim().length > 0
        ? error.message.trim()
        : "unknown_client_runtime_error";
  const stackLines = typeof error?.stack === "string"
    ? error.stack
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 6)
        .join("\n")
    : "";

  panel.hidden = false;
  panel.setAttribute("data-visible", "true");
  message.textContent = messageText;
  stack.textContent = stackLines;
}

export function GlobalRuntimeErrorListener() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      revealRuntimeError(event.error ?? event.message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      revealRuntimeError(event.reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return (
    <div
      id={RUNTIME_PANEL_ID}
      hidden
      className="fixed inset-x-3 top-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white/95 p-4 shadow-2xl backdrop-blur"
    >
      <p className="text-xs uppercase tracking-[0.28em] text-rose-600">Client runtime error</p>
      <p id={MESSAGE_ID} className="mt-2 break-all text-sm font-medium text-rose-950">
        unknown_client_runtime_error
      </p>
      <pre
        id={STACK_ID}
        className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-2xl bg-stone-50 px-3 py-3 text-xs leading-6 text-stone-700"
      />
    </div>
  );
}
