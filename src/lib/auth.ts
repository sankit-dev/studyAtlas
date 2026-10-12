import { sentinelClient } from "@better-auth/infra/client";
import { createAuthClient } from "better-auth/react";
import { apiOrigin } from "./api";

// In production, route auth through the frontend origin (for example via a
// Vercel rewrite). OAuth state and session cookies then remain first-party.
const authOrigin = import.meta.env.VITE_AUTH_ORIGIN;

export const authClient = createAuthClient({
  baseURL: authOrigin ? `${authOrigin}/api/auth` : `${apiOrigin}/api/auth`,
  plugins: [sentinelClient()],
});
