import React from "react";
import dynamic from "next/dynamic";
import LoginLayout from "../components/LoginLayout";

// Dynamically import to avoid SSR issues
const CreatePasswordPage = dynamic(() => import("../components/CreatePasswordPage"), {
  ssr: false,
});

export default function CreatePassword() {
  return (
    <LoginLayout>
      <CreatePasswordPage />
    </LoginLayout>
  );
}