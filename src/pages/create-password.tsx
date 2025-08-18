import React from "react";
import dynamic from "next/dynamic";
import LoginLayout from "../components/LoginLayout";

// Dynamically import to avoid SSR issues
const CreatePasswordPage = dynamic(() => import("../nomyx-components/auth/CreatePasswordPage"), {
  ssr: false,
});

export default function CreatePassword() {
  const handleNavigate = (path: string) => {
    // Handle navigation - this would typically use Next.js router
    console.log('Navigate to:', path);
  };

  const handleSignUp = async (data: any) => {
    // Handle sign up - this would typically make an API call
    console.log('Sign up data:', data);
    // For now, just return a resolved promise
    return Promise.resolve();
  };

  return (
    <LoginLayout>
      <CreatePasswordPage
        onNavigate={handleNavigate}
        onSignUp={handleSignUp}
      />
    </LoginLayout>
  );
}