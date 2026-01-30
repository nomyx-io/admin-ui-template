import { useEffect, useState } from "react";

import { useDisconnect } from "wagmi";

const AutoLogout = () => {
  const { disconnect } = useDisconnect();
  const [expirationTime, setExpirationTime] = useState<number | null>(null);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);
  const [waitingForToken, setWaitingForToken] = useState(true); // NEW: Wait until tokenExpiration exists

  useEffect(() => {
    const waitForToken = setInterval(() => {
      const tokenExpString = localStorage.getItem("tokenExpiration");

      if (tokenExpString) {
        // "TokenExpiration detected. Starting AutoLogout.");
        clearInterval(waitForToken);
        setWaitingForToken(false);
        checkExpiration();
      }
    }, 500); // Check every 500ms if tokenExpiration is set

    return () => clearInterval(waitForToken);
  }, []);

  const checkExpiration = () => {
    //Running checkExpiration...;

    const tokenExpString = localStorage.getItem("tokenExpiration");

    if (!tokenExpString) {
      // No token expiration found. Skipping logout timer.");
      return;
    }

    const tokenExp = Number(tokenExpString);
    if (isNaN(tokenExp)) {
      //Invalid tokenExpiration format! Clearing session...");
      handleLogout();
      return;
    }

    setExpirationTime(tokenExp);
    //AutoLogout initialized - Token expires at: ${new Date(tokenExp).toLocaleTimeString()} (${tokenExp})`);

    const timeRemaining = tokenExp - Date.now();
    //`Time remaining: ${Math.max(Math.round(timeRemaining / 1000), 0)}s`);

    if (timeRemaining <= 0) {
      // Token expired! Logging out...");
      handleLogout();
      return;
    }

    setTimeout(checkExpiration, 1000);
  };

  const handleLogout = () => {
    if (hasLoggedOut) {
      // Logout already triggered. Skipping...";
      return;
    }

    //Logging out...;
    setHasLoggedOut(true);
    disconnect();

    localStorage.removeItem("sessionToken");
    localStorage.removeItem("tokenExpiration");

    setTimeout(() => {
      //Redirecting to /login...;
      window.location.href = "/login";
    }, 500);
  };

  if (waitingForToken) {
    return null; // Don't start countdown yet
  }

  return null;
};

export default AutoLogout;
