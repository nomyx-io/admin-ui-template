import React, { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const sessionToken = localStorage.getItem("sessionToken");
    const tokenExpiration = localStorage.getItem("tokenExpiration");
    
    if (!sessionToken || !tokenExpiration) {
      router.push("/login");
      return;
    }

    // Check if token is expired
    const expirationTime = parseInt(tokenExpiration);
    if (Date.now() > expirationTime) {
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("tokenExpiration");
      localStorage.removeItem("user");
      router.push("/login");
      return;
    }

    // If authenticated, redirect to dashboard
    router.push("/dashboard");
  }, [router]);

  return null;
}