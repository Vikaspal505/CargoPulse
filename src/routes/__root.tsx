import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-neutral-100 ring-1 ring-black/5 mx-auto">
          <span className="text-4xl select-none">🗺️</span>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">404</p>
          <h1 className="font-serif text-4xl italic text-foreground">Route not found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 text-white px-5 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-700"
        >
          ← Back to Operations
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-50 ring-1 ring-red-100 mx-auto">
          <span className="text-4xl select-none">⚠️</span>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-red-400">System error</p>
          <h1 className="font-serif text-3xl italic text-foreground">This page didn&apos;t load</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Something went wrong. You can try refreshing or head back home.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 text-white px-5 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-700"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-50"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Forward.ai — Predictive Backhaul" },
      {
        name: "description",
        content:
          "AI-powered predictive backhaul matching for Indian freight corridors. Real road routing, autonomous coordinator, concrete ROI.",
      },
      { name: "author", content: "Forward.ai" },
      { property: "og:title", content: "Forward.ai — Predictive Backhaul" },
      {
        property: "og:description",
        content:
          "Autonomous coordinator that turns empty return legs into matched shipments on the Delhi–Mumbai corridor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});


function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
