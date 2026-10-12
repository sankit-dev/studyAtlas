import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth";
import { apiFetch, readJson } from "../lib/api";

type SocialProvider = "github";

type AuthProvidersResponse = {
  providers?: Partial<Record<SocialProvider, boolean>>;
};

const providerLabels: Record<SocialProvider, string> = {
  github: "GitHub",
};

function getCallbackURL() {
  return `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

// Better Auth appends ?error=<code> to errorCallbackURL (or errorURL) when an
// OAuth flow fails.
const authErrorMessages: Record<string, string> = {
  access_denied: "GitHub login was cancelled.",
  state_mismatch: "Login expired. Please try again.",
  please_restart_the_process: "Login expired. Please try again.",
};

function readAuthErrorFromUrl() {
  const code = new URLSearchParams(window.location.search).get("error");

  if (!code) return "";

  return authErrorMessages[code] ?? "Login failed. Please try again.";
}

function clearAuthErrorFromUrl() {
  const url = new URL(window.location.href);

  if (!url.searchParams.has("error")) return;

  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.history.replaceState(window.history.state, "", url);
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
}

export function AuthControls() {
  const { data: session } = authClient.useSession();
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(
    null,
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [enabledProviders, setEnabledProviders] = useState<SocialProvider[]>(
    ["github"],
  );
  const [authError, setAuthError] = useState(readAuthErrorFromUrl);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(clearAuthErrorFromUrl, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProviders() {
      try {
        const response = await apiFetch('/api/auth/providers', {
          credentials: 'omit',
          signal: AbortSignal.timeout(1500),
        });

        if (!response.ok) {
          throw new Error("Unable to load auth providers");
        }

        const data = await readJson<AuthProvidersResponse>(response);
        const providers: SocialProvider[] = [];

        if (data.providers?.github) {
          providers.push("github");
        }

        if (isMounted) {
          setEnabledProviders(providers);
        }
      } catch {
        // Keep default github provider enabled if network fails/times out
      }
    }

    void loadProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const signIn = async (provider: SocialProvider) => {
    setPendingProvider(provider);
    setAuthError("");

    try {
      await authClient.signIn.social({
        provider,
        callbackURL: getCallbackURL(),
        errorCallbackURL: getCallbackURL(),
      });
    } catch {
      setAuthError(`Could not start ${providerLabels[provider]} login.`);
    } finally {
      setPendingProvider(null);
    }
  };

  const signOut = async () => {
    setIsSigningOut(true);
    setDropdownOpen(false);

    try {
      await authClient.signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  if (session?.user) {
    const { name, email, image } = session.user;
    const initials = getInitials(name, email);

    return (
      <div className="auth-avatar-wrap" ref={dropdownRef}>
        <button
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          aria-label="Open account menu"
          className="auth-avatar-btn"
          onClick={() => setDropdownOpen((v) => !v)}
          type="button"
        >
          <span aria-hidden="true" className="auth-avatar-ring" />
          <span className="auth-avatar-inner">
            {image ? (
              <img
                alt={name ?? email ?? "User"}
                className="auth-avatar-img"
                src={image}
              />
            ) : (
              <span className="auth-avatar-initials">{initials}</span>
            )}
          </span>
        </button>

        {dropdownOpen && (
          <div className="auth-dropdown" role="menu">
            <div className="auth-dropdown__header">
              <div className="auth-dropdown__avatar-lg">
                {image ? (
                  <img alt={name ?? ""} src={image} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="auth-dropdown__info">
                {name && <p className="auth-dropdown__name">{name}</p>}
                {email && <p className="auth-dropdown__email">{email}</p>}
              </div>
            </div>
            <div className="auth-dropdown__divider" />
            <button
              className="auth-dropdown__sign-out"
              disabled={isSigningOut}
              onClick={() => void signOut()}
              role="menuitem"
              type="button"
            >
              {isSigningOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
      </div>
    );
  }

  const isGithubEnabled = enabledProviders.includes("github");

  return (
    <div className='auth-save-progress'>
      <div className='auth-save-progress__action'>
        <button
          className='auth-login-button'
          disabled={!isGithubEnabled || pendingProvider !== null}
          onClick={() => void signIn("github")}
          title={
            isGithubEnabled
              ? "Login to save notes and DSA progress"
              : "GitHub login is not configured yet"
          }
          type='button'
        >
          {pendingProvider === "github" ? "Opening..." : "Login"}
          <span aria-hidden="true">→</span>
        </button>
        {(authError || !isGithubEnabled) && (
          <p className='auth-save-progress__error'>
            {authError || "GitHub login setup needed"}
          </p>
        )}
      </div>
    </div>
  );
}
