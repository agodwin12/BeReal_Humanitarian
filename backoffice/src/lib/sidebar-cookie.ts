// Plain module (no "use client") so both the client sidebar and the server
// dashboard layout can read the same cookie name. A server component that
// imported it from ui/sidebar.tsx would receive a client reference, not a string.
export const SIDEBAR_COOKIE_NAME = "sidebar_state";
