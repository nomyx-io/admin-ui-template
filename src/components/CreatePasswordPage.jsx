// src/pages/SignUp.jsx
import React, { useState } from "react";

import { CheckOutlined } from "@ant-design/icons"; // Import icon
import { Layout, Form, Input, Button, Card } from "antd";
import Parse from "parse";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import logoDark from "../assets/nomyx_logo_dark.png";
import logoLight from "../assets/nomyx_logo_light.png";

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
        {/* Left Section */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 md:px-6 my-10">
          <div className="w-full max-w-2xl">
            <img src={logoLight} alt="Logo" width={630} height={240} priority className="block dark:hidden" />
            <img src={logoDark} alt="Logo" width={630} height={240} priority className="hidden dark:block" />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex-grow flex items-center justify-center w-full">
          <div className="p-10 max-w-2xl items-center justify-center login-div w-full">
            <div className="w-full flex flex-col justify-center items-center p-4">
              <Card
                title={<span className="text-black">Create Password</span>}
                style={{
                  width: "100%",
                  maxWidth: "550px",
                  border: "1px solid #BBBBBB",
                }}
                className="password-card bg-[#3E81C833] shadow-lg rounded-lg wallet-setup-radio-group"
              >
                <Form layout="vertical" onFinish={handleFormSubmit}>
                  {/* Password Field */}
                  <Form.Item
                    name="password"
                    label={<span className="text-[#1F1F1F]">Password</span>}
                    rules={[{ required: true, message: "Please enter your password!" }]}
                  >
                    <Input.Password placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="signup-input" />
                  </Form.Item>

                  {/* Confirm Password Field */}
                  <Form.Item
                    name="confirmPassword"
                    label={<span className="text-[#1F1F1F]">Confirm Password</span>}
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
                      className="signup-input"
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
                  <div className="flex justify-end">
                    <Form.Item className="m-0">
                      <Button type="primary" htmlType="submit" className="signup-button">
                        Submit
                      </Button>
                    </Form.Item>
                  </div>
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
