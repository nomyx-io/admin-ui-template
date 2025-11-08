import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { PortalStorage } from "@nomyx/shared";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const sessionToken = PortalStorage.getItem("sessionToken");
    const tokenExpiration = PortalStorage.getItem("tokenExpiration");

    if (!sessionToken || !tokenExpiration) {
      router.push("/login");
      return;
    }

    // Check if token is expired
    const expirationTime = parseInt(tokenExpiration);
    if (Date.now() > expirationTime) {
      PortalStorage.removeItem("sessionToken");
      PortalStorage.removeItem("tokenExpiration");
      PortalStorage.removeItem("user");
      router.push("/login");
      return;
    }

    // If authenticated, redirect to dashboard
    router.push("/dashboard");
  }, [router]);

  return null;
}