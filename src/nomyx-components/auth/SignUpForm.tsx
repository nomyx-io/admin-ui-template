import React, { useState } from "react";
import { Card, Form, Input, Button } from "antd";

export interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
}

export interface SignUpFormProps {
  onNext: (values: SignUpFormData) => void;
  formData?: Partial<SignUpFormData>;
  logo?: string;
  backgroundImage?: string;
  showOnboardingLink?: boolean;
  onOnboardingClick?: () => void;
  showSignInLink?: boolean;
  signInPath?: string;
  onNavigate?: (path: string) => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onNext,
  formData,
  logo,
  backgroundImage,
  showOnboardingLink = false,
  onOnboardingClick,
  showSignInLink = true,
  signInPath = "/login",
  onNavigate,
}) => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Initial form values (from parent state)
  const initialValues = formData || {};

  const onSubmit = (values: SignUpFormData) => {
    onNext(values); // Pass form data to parent and switch to PasswordForm
  };

  const handleOnboardClick = () => {
    if (onOnboardingClick) {
      onOnboardingClick();
    } else {
      setIsModalVisible(true); // Open the modal
    }
  };

  const handleSignInClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(signInPath);
    } else {
      window.location.href = signInPath;
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left Section - Custom Gradient Background and Logo */}
      <div
        className="bg-black hidden sm:flex w-1/2 flex-col justify-center items-center gap-10"
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
      >
        {logo && <img alt="Logo" src={logo} style={{ width: "75%" }} />}
      </div>
      
      {/* Right Section - Sign Up Form */}
      <div className="flex flex-col justify-center items-center w-1/2 bg-white auth-pages">
        <Card
          title={<span className="text-black">Sign Up</span>}
          style={{
            width: "550px",
            border: "1px solid #BBBBBB",
          }}
          className="signup-card bg-white"
        >
          <Form layout="vertical" form={form} initialValues={initialValues} onFinish={onSubmit}>
            {/* First Name and Last Name in one row */}
            <div className="flex gap-4">
              <Form.Item
                name="firstName"
                label={<span className="text-[#1F1F1F]">First Name</span>}
                rules={[{ required: true, message: "Please enter your first name" }]}
                className="w-1/2"
              >
                <Input
                  placeholder="First Name"
                  style={{
                    color: "#1F1F1F",
                    backgroundColor: "transparent",
                    border: "1px solid #BBBBBB",
                  }}
                  className="signup-input"
                />
              </Form.Item>

              <Form.Item
                name="lastName"
                label={<span className="text-[#1F1F1F]">Last Name</span>}
                rules={[{ required: true, message: "Please enter your last name" }]}
                className="w-1/2"
              >
                <Input
                  placeholder="Last Name"
                  style={{
                    color: "#1F1F1F",
                    backgroundColor: "transparent",
                    border: "1px solid #BBBBBB",
                  }}
                  className="signup-input"
                />
              </Form.Item>
            </div>

            {/* Email with Validation */}
            <Form.Item
              name="email"
              label={<span className="text-[#1F1F1F]">Email</span>}
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
                  color: "#1F1F1F",
                  backgroundColor: "transparent",
                  border: "1px solid #BBBBBB",
                }}
                className="signup-input"
              />
            </Form.Item>

            {/* Company/Organization */}
            <Form.Item
              name="company"
              label={<span className="text-[#1F1F1F]">Company/Organization</span>}
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
                  color: "#1F1F1F",
                  backgroundColor: "transparent",
                  border: "1px solid #BBBBBB",
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
            {showOnboardingLink && (
              <p className="text-black font-bold">
                Onboarding Pending?&nbsp;
                <button onClick={handleOnboardClick} className="text-blue-600 focus:outline-none">
                  Onboard
                </button>
              </p>
            )}
            {showSignInLink && (
              <p className="text-black font-bold ml-auto">
                Already have an account?&nbsp;
                <a href={signInPath} onClick={handleSignInClick} className="text-blue-600">
                  Sign In
                </a>
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SignUpForm;