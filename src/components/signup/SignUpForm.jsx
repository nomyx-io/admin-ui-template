// src/components/signup/SignUpForm.jsx

import React, { useState } from "react";

import { Card, Form, Input, Button } from "antd";
import { Link } from "react-router-dom"; // Import Link from react-router-dom

import nomyxLogo from "../../Assets/nomyx_logo_white.svg"; // Adjust the path as needed
import bg from "../../images/BlackPaintBackground.webp";
import styles from "../LoginPage.module.css";

// import CheckUserOnboarding from "./CheckUserOnboarding"; // Adjust the import path as needed

const SignUpForm = ({ onNext, formData }) => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Initial form values (from parent state)
  const initialValues = formData;

  const onSubmit = (values) => {
    onNext(values); // Pass form data to parent and switch to PasswordForm
  };

  const handleOnboardClick = () => {
    setIsModalVisible(true); // Open the modal
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left Section - Custom Gradient Background and Logo */}
      <div
        className={styles.logoContainer + " bg-black hidden sm:flex w-1/2 flex-col justify-center items-center gap-10"}
        style={{ backgroundImage: `url(${bg})` }}
      >
        <img alt="Nomyx Logo" src={nomyxLogo} style={{ width: "75%" }} />
      </div>
      {/* Right Section - Sign Up Form */}
      <div className="flex flex-col justify-center items-center w-1/2 bg-white auth-pages">
        <Card
          title={<span className="text-black">Sign Up</span>} // Set title color to black
          style={{
            width: "550px",
            border: "1px solid #BBBBBB", // Set Card border color inline
          }}
          className="signup-card bg-white"
        >
          <Form layout="vertical" form={form} initialValues={initialValues} onFinish={onSubmit}>
            {/* First Name and Last Name in one row */}
            <div className="flex gap-4">
              <Form.Item
                name="firstName"
                label={<span className="text-[#1F1F1F]">First Name</span>} // Set label color
                rules={[{ required: true, message: "Please enter your first name" }]}
                className="w-1/2"
              >
                <Input
                  placeholder="First Name"
                  style={{
                    color: "#1F1F1F", // Text color
                    backgroundColor: "transparent", // Transparent background
                    border: "1px solid #BBBBBB", // Border color
                  }}
                  className="signup-input"
                />
              </Form.Item>

              <Form.Item
                name="lastName"
                label={<span className="text-[#1F1F1F]">Last Name</span>} // Set label color
                rules={[{ required: true, message: "Please enter your last name" }]}
                className="w-1/2"
              >
                <Input
                  placeholder="Last Name"
                  style={{
                    color: "#1F1F1F", // Text color
                    backgroundColor: "transparent", // Transparent background
                    border: "1px solid #BBBBBB", // Border color
                  }}
                  className="signup-input"
                />
              </Form.Item>
            </div>

            {/* Email with Validation */}
            <Form.Item
              name="email"
              label={<span className="text-[#1F1F1F]">Email</span>} // Set label color
              rules={[
                { required: true, message: "Please enter your email" },
                {
                  type: "email",
                  message: "Please enter a valid email address",
                },
              ]}
            >
              <Input
                placeholder="Email"
                style={{
                  color: "#1F1F1F", // Text color
                  backgroundColor: "transparent", // Transparent background
                  border: "1px solid #BBBBBB", // Border color
                }}
                className="signup-input"
              />
            </Form.Item>

            {/* Company/Organization */}
            <Form.Item
              name="company"
              label={<span className="text-[#1F1F1F]">Company/Organization</span>} // Set label color
              rules={[
                {
                  required: true,
                  message: "Please enter your company/organization!",
                },
              ]}
            >
              <Input
                placeholder="Company/Organization"
                style={{
                  color: "#1F1F1F", // Text color
                  backgroundColor: "transparent", // Transparent background
                  border: "1px solid #BBBBBB", // Border color
                }}
                className="signup-input"
              />
            </Form.Item>

            {/* Submit Button */}
            <Form.Item className="actions">
              <div className="flex justify-end">
                <Button type="primary" htmlType="submit" className="signup-button">
                  Next
                </Button>
              </div>
            </Form.Item>
          </Form>
          <div className="flex justify-between mt-4">
            <p className="text-black font-bold">
              Onboarding Pending?&nbsp;
              <button onClick={handleOnboardClick} className="text-blue-600 focus:outline-none">
                Onboard
              </button>
            </p>
            <p className="text-black font-bold">
              Already have an account?&nbsp;
              <Link to="/login" className="text-blue-600">
                Sign In
              </Link>
            </p>
          </div>
        </Card>
      </div>
      {/* <CheckUserOnboarding visible={isModalVisible} onClose={() => setIsModalVisible(false)} /> */}
    </div>
  );
};

export default SignUpForm;
