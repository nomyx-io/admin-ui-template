import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { SignUpForm, SignUpFormData } from "./SignUpForm";
import { PasswordForm, PasswordFormData } from "./PasswordForm";
import { WalletPreference } from "./types";

export interface CreatePasswordPageProps {
  // Branding
  logo?: string;
  backgroundImage?: string;
  
  // Navigation
  onNavigate: (path: string) => void;
  signInPath?: string;
  
  // Sign up handler
  onSignUp: (data: SignUpFormData & PasswordFormData) => Promise<void>;
  
  // Additional options
  showOnboardingLink?: boolean;
  onOnboardingClick?: () => void;
  showWalletOptions?: boolean;
  defaultWalletPreference?: WalletPreference;
}

export const CreatePasswordPage: React.FC<CreatePasswordPageProps> = ({
  logo,
  backgroundImage,
  onNavigate,
  signInPath = "/login",
  onSignUp,
  showOnboardingLink = false,
  onOnboardingClick,
  showWalletOptions = true,
  defaultWalletPreference = WalletPreference.BACKEND,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<SignUpFormData>>({});
  const [loading, setLoading] = useState(false);

  // Handle sign up form submission
  const handleSignUpFormNext = (values: SignUpFormData) => {
    setFormData(values);
    setCurrentStep(2);
  };

  // Handle password form submission
  const handlePasswordFormSubmit = async (values: PasswordFormData) => {
    const completeData = {
      ...formData,
      ...values,
    } as SignUpFormData & PasswordFormData;

    setLoading(true);
    try {
      await onSignUp(completeData);
      toast.success("Account created successfully!");
      onNavigate(signInPath);
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error(error.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    setCurrentStep(1);
  };

  return (
    <>
      {currentStep === 1 && (
        <SignUpForm
          onNext={handleSignUpFormNext}
          formData={formData}
          logo={logo}
          backgroundImage={backgroundImage}
          showOnboardingLink={showOnboardingLink}
          onOnboardingClick={onOnboardingClick}
          showSignInLink={true}
          signInPath={signInPath}
          onNavigate={onNavigate}
        />
      )}
      {currentStep === 2 && (
        <PasswordForm
          onSubmit={handlePasswordFormSubmit}
          onBack={handleBack}
          loading={loading}
          logo={logo}
          backgroundImage={backgroundImage}
          showWalletOptions={showWalletOptions}
          defaultWalletPreference={defaultWalletPreference}
        />
      )}
    </>
  );
};

export default CreatePasswordPage;