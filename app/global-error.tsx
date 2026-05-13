"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error-boundary]", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#020617",
          color: "#f1f5f9",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "4rem 1.5rem",
          gap: "1.25rem",
          maxWidth: "44rem",
          marginLeft: "auto",
          marginRight: "auto",
          boxSizing: "border-box",
        }}
      >
        <p
          aria-hidden="true"
          style={{
            margin: 0,
            fontFamily:
              "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
            fontSize: "0.75rem",
            letterSpacing: "0.3em",
            color: "#f87171",
          }}
        >
          500
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "2rem",
            fontWeight: 600,
            letterSpacing: "-0.025em",
          }}
        >
          witus.online is having a problem.
        </h1>
        <p style={{ margin: 0, fontSize: "1rem", color: "#94a3b8" }}>
          The page failed at the top level — even the chrome didn&rsquo;t
          render. This is rare. Reload, and if it keeps happening, drop us a
          note.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "2.75rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: "#14b8a6",
              color: "#020617",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              minHeight: "2.75rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #334155",
              color: "#f1f5f9",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Back to home
          </a>
        </div>
        {error.digest ? (
          <p
            style={{
              margin: 0,
              fontFamily:
                "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
              fontSize: "0.75rem",
              color: "#64748b",
              wordBreak: "break-all",
            }}
          >
            Diagnostic id: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
