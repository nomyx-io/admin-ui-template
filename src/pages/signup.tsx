import React from "react";
import dynamic from "next/dynamic";
import LoginLayout from "../components/LoginLayout";

// Dynamically import to avoid SSR issues
const SignUpPage = dynamic(() => import("../components/SignUpPage"), {
  ssr: false,
});

export default function SignUp() {
  return (
    <LoginLayout>
      <SignUpPage />
    </LoginLayout>
  );
}