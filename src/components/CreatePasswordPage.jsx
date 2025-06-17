// src/pages/SignUp.jsx
import React, { useState } from "react";

import { CheckOutlined } from "@ant-design/icons"; // Import icon
import { Layout, Form, Input, Button, Card } from "antd";
import Parse from "parse";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import logoDark from "../assets/nomyx_logo_dark.png";

const { Content } = Layout;

const CreatePassword = ({ service }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { token } = useParams();
  const navigate = useNavigate();

  const passwordCriteria = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const renderIcon = (condition) => {
    return condition ? <CheckOutlined className="!text-green-500" /> : <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />;
  };

  const handleFormSubmit = async () => {
    try {
      const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
      if (!isPasswordValid) {
        toast.error("Please meet all password requirements.");
        return;
      }

      toast.promise(
        async () => {
          const response = await Parse.Cloud.run("resetPassword", {
            token,
            newPassword: password,
            skipEmail: true,
          });

          if (response.success) {
            navigate("/login");
          } else {
            throw new Error(response.message || "Password reset failed.");
          }
        },
        {
          pending: "Setting up your new password...",
          success: "New password set up successfully!",
          error: "Failed to set up a new password.",
        }
      );
    } catch (e) {
      toast.error(e.message || "There was an error setting up the password.");
    }
  };

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden flex flex-col"
      style={{
        backgroundImage: "url('/images/nomyx_banner.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left Section - Custom Gradient Background and Logo */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 md:px-6 my-10">
          <div className="w-full max-w-2xl">
            <img src={logoDark} alt="Logo" width={630} height={240} priority />
          </div>
        </div>

        {/* Right Section */}
        <div className="max-[550px]:hidden w-1/2 flex flex-col justify-center items-center p-2">
          <div className="w-full lg:w-3/4 flex items-center justify-center px-4 md:px-6">
            <div className="bg-nomyxDark1 bg-opacity-90 text-nomyxWhite shadow-lg rounded-lg p-4 max-w-2xl w-full">
              <div className="w-full flex flex-col justify-center items-center"></div>
              <Card
                title={<span className="text-white">Create Password</span>}
                style={{
                  width: "100%",
                  maxWidth: "550px",
                  border: "none",
                }}
                className="password-card bg-transparent shadow-lg rounded-lg"
              >
                <Form layout="vertical" onFinish={handleFormSubmit} className="w-full">
                  {/* Password Field */}
                  <Form.Item
                    name="password"
                    label={<span className="text-gray-400">Password</span>}
                    rules={[{ required: true, message: "Please enter your password!" }]}
                  >
                    <Input.Password
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="signup-input placeholder-nomyxGray1 !border-nomyxGray1"
                    />
                  </Form.Item>

                  {/* Confirm Password Field */}
                  <Form.Item
                    name="confirmPassword"
                    label={<span className="text-gray-400">Confirm Password</span>}
                    dependencies={["password"]}
                    rules={[
                      { required: true, message: "Please confirm your password!" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("Passwords do not match!"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="signup-input placeholder-nomyxGray1 !border-nomyxGray1"
                    />
                  </Form.Item>

                  {/* Password Requirements */}
                  <div className="text-sm">
                    {[
                      { label: "At least 8 characters", condition: passwordCriteria.minLength },
                      { label: "At least 1 uppercase letter", condition: passwordCriteria.hasUppercase },
                      { label: "At least 1 lowercase letter", condition: passwordCriteria.hasLowercase },
                      { label: "At least 1 number", condition: passwordCriteria.hasNumber },
                      { label: "At least 1 special character", condition: passwordCriteria.hasSpecialChar },
                    ].map(({ label, condition }, index) => (
                      <p key={index} className="flex items-center">
                        {renderIcon(condition)}
                        <span className={`ml-2 ${condition ? "text-green-500" : "text-gray-500"}`}>{label}</span>
                      </p>
                    ))}
                  </div>

                  {/* Submit Button */}
                  <Form.Item>
                    <div className="flex justify-end">
                      <Button type="primary" htmlType="submit" className="signup-button">
                        Submit
                      </Button>
                    </div>
                  </Form.Item>
                </Form>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePassword;
