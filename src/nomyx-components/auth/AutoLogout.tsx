import React, { useEffect, useState } from "react";

export interface AutoLogoutProps {
  tokenExpirationKey?: string;
  sessionTokenKey?: string;
  onLogout?: () => void;
  redirectPath?: string;
  checkInterval?: number;
}

export const AutoLogout: React.FC<AutoLogoutProps> = ({
  tokenExpirationKey = "tokenExpiration",
  sessionTokenKey = "sessionToken",
  onLogout,
  redirectPath = "/login",
  checkInterval = 1000,
}) => {
  const [expirationTime, setExpirationTime] = useState<number | null>(null);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);
  const [waitingForToken, setWaitingForToken] = useState(true);

  useEffect(() => {
    const waitForToken = setInterval(() => {
      const tokenExpString = localStorage.getItem(tokenExpirationKey);

      if (tokenExpString) {
        console.log("✅ TokenExpiration detected. Starting AutoLogout.");
        clearInterval(waitForToken);
        setWaitingForToken(false);
        checkExpiration();
      }
    }, 500); // Check every 500ms if tokenExpiration is set

    return () => clearInterval(waitForToken);
  }, [tokenExpirationKey]);

  const checkExpiration = () => {
    const tokenExpString = localStorage.getItem(tokenExpirationKey);

    if (!tokenExpString) {
      console.warn("⚠️ No token expiration found. Skipping logout timer.");
      return;
    }

    const tokenExp = Number(tokenExpString);
    if (isNaN(tokenExp)) {
      console.error("🚨 Invalid tokenExpiration format! Clearing session...");
      handleLogout();
      return;
    }

    setExpirationTime(tokenExp);

    const timeRemaining = tokenExp - Date.now();

    if (timeRemaining <= 0) {
      console.log("🚨 Token expired! Logging out...");
      handleLogout();
      return;
    }

    setTimeout(checkExpiration, checkInterval);
  };

  const handleLogout = () => {
    if (hasLoggedOut) {
      console.warn("🚫 Logout already triggered. Skipping...");
      return;
    }

    console.log("🚨 Auto-logout triggered - session expired");
    setHasLoggedOut(true);

    // Clear local storage
    localStorage.removeItem(sessionTokenKey);
    localStorage.removeItem(tokenExpirationKey);

    // Call custom logout handler if provided
    if (onLogout) {
      onLogout();
    }

    // Redirect after a short delay
    setTimeout(() => {
      console.log(`🔄 Redirecting to ${redirectPath}...`);
      window.location.href = redirectPath;
    }, 500);
  };

  if (waitingForToken) {
    console.log("⏳ Waiting for tokenExpiration...");
    return null;
  }

  return null;
};

export default AutoLogout;