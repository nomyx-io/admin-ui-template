import { useEffect, useState } from "react";

// Removed wagmi - using blockchain-agnostic approach

const AutoLogout = () => {
  const [expirationTime, setExpirationTime] = useState<number | null>(null);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);
  const [waitingForToken, setWaitingForToken] = useState(true);

  useEffect(() => {
    const waitForToken = setInterval(() => {
      const tokenExpString = localStorage.getItem("tokenExpiration");

      if (tokenExpString) {
        console.log("✅ TokenExpiration detected. Starting AutoLogout.");
        clearInterval(waitForToken);
        setWaitingForToken(false);
        checkExpiration();
      }
    }, 500); // Check every 500ms if tokenExpiration is set

    return () => clearInterval(waitForToken);
  }, []);

  const checkExpiration = () => {
    //console.log("🔍 Running checkExpiration...");

    const tokenExpString = localStorage.getItem("tokenExpiration");

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
    //console.log(`✅ AutoLogout initialized - Token expires at: ${new Date(tokenExp).toLocaleTimeString()} (${tokenExp})`);

    const timeRemaining = tokenExp - Date.now();
    // console.log(`⏳ Time remaining: ${Math.max(Math.round(timeRemaining / 1000), 0)}s`);

    if (timeRemaining <= 0) {
      console.log("🚨 Token expired! Logging out...");
      handleLogout();
      return;
    }

    setTimeout(checkExpiration, 1000);
  };

  const handleLogout = () => {
    if (hasLoggedOut) {
      console.warn("🚫 Logout already triggered. Skipping...");
      return;
    }

    console.log("🚨 Auto-logout triggered - blockchain-agnostic session expired");
    setHasLoggedOut(true);

    localStorage.removeItem("sessionToken");
    localStorage.removeItem("tokenExpiration");

    setTimeout(() => {
      console.log("🔄 Redirecting to /login...");
      window.location.href = "/login";
    }, 500);
  };

  if (waitingForToken) {
    console.log("⏳ Waiting for tokenExpiration...");
    return null; // Don't start countdown yet
  }

  return null;
};

export default AutoLogout;
