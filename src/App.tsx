import React, { useEffect } from "react";

// Minimal App component that just redirects to Next.js pages
function App() {
  useEffect(() => {
    // Redirect to the Next.js page router
    if (typeof window !== 'undefined') {
      // If we're at the root, go to dashboard
      if (window.location.pathname === '/' || window.location.pathname === '') {
        window.location.href = '/dashboard';
      }
    }
  }, []);

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center",
      backgroundColor: "#f0f2f5"
    }}>
      <h2>Redirecting...</h2>
    </div>
  );
}

export default App;