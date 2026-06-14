// Generic application error reporting.
// Captures errors from React error boundaries and global listeners,
// then dispatches them to any registered handlers (e.g. Sentry, custom analytics).

type ErrorSeverity = "error" | "warning" | "info";

type ErrorContext = Record<string, unknown>;

type ErrorHandler = (
  error: unknown,
  context: ErrorContext,
  severity: ErrorSeverity,
) => void;

const handlers: ErrorHandler[] = [];

/**
 * Register a custom error handler (e.g. Sentry.captureException wrapper).
 * Can be called multiple times — all handlers are invoked on each error.
 */
export function registerErrorHandler(handler: ErrorHandler): () => void {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i !== -1) handlers.splice(i, 1);
  };
}

/**
 * Report an error with optional context metadata.
 * Falls back to console.error if no handlers are registered.
 */
export function reportError(
  error: unknown,
  context: ErrorContext = {},
  severity: ErrorSeverity = "error",
) {
  const enriched: ErrorContext = {
    ...context,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    timestamp: new Date().toISOString(),
  };

  if (handlers.length === 0) {
    if (severity === "error") {
      console.error("[FreightFlow Error]", error, enriched);
    } else if (severity === "warning") {
      console.warn("[FreightFlow Warning]", error, enriched);
    } else {
      console.info("[FreightFlow Info]", error, enriched);
    }
    return;
  }

  for (const handler of handlers) {
    try {
      handler(error, enriched, severity);
    } catch (handlerError) {
      console.error("[FreightFlow] Error in error handler:", handlerError);
    }
  }
}
