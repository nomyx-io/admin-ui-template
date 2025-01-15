// src/pages/SignUp.jsx

import React, { useState } from "react";

import { Layout } from "antd";
import Parse from "parse";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify"; // Ensure react-toastify is installed

import SignUpForm from "./signup/SignUpForm";
import ConfirmMessage from "../components/signup/ConfirmMessage";
import PasswordForm from "../components/signup/PasswordForm";

const { Content } = Layout;

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showConfirmMessage, setShowConfirmMessage] = useState(false);
  const navigate = useNavigate();

  // Handle next step to show the password form
  const handleNext = (data) => {
    setFormData(data);
    setShowPasswordForm(true);
  };

  // Handle going back from password form to sign-up form
  const handleBack = () => {
    setShowPasswordForm(false);
    setShowConfirmMessage(false);
  };

  // Handle the final submit when the password form is submitted
  const handleSubmit = async (data) => {
    try {
      toast.promise(
        async () => {
          // Log out the user if logged in (Parse-specific)
          await Parse.User.logOut();

          // Make API call to register the user
          const response = await Parse.Cloud.run("registerUser", {
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: formData.email,
            password: data.password, // Password from password form
            email: formData.email.toLowerCase(),
            company: formData.company,
          });

          // Handle the API response
          if (response.success) {
            setShowConfirmMessage(true); // Show confirmation message

            // Optional: Navigate to another page after successful registration
            // navigate("/welcome"); // Uncomment and set your desired route
          } else {
            throw new Error(response.message || "User registration failed.");
          }
        },
        {
          pending: "Registering...",
          success: "Registration successful!",
          error: "Registration failed.",
        }
      );
    } catch (e) {
      // Display the error in a toast
      toast.error(e.message || "There was an error registering the user");
    }
  };

  return (
    <Layout
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Content
        style={{
          flexGrow: 1, // Take up remaining space
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f0f2f5",
          overflow: "hidden", // Prevent scroll
        }}
      >
        {showConfirmMessage ? (
          <ConfirmMessage email={formData.email} />
        ) : showPasswordForm ? (
          <PasswordForm onBack={handleBack} onSubmit={handleSubmit} />
        ) : (
          <SignUpForm onNext={handleNext} formData={formData} />
        )}
      </Content>
    </Layout>
  );
};

export default SignUp;
