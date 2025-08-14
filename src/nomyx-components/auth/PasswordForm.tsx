import React, { useState } from "react";
import { Card, Form, Input, Button, Radio } from "antd";
import { WalletPreference } from "./types";

export interface PasswordFormData {
  password: string;
  confirmPassword: string;
  walletPreference: WalletPreference;
}

export interface PasswordFormProps {
  onSubmit: (values: PasswordFormData) => void;
  onBack?: () => void;
  loading?: boolean;
  logo?: string;
  backgroundImage?: string;
  showWalletOptions?: boolean;
  defaultWalletPreference?: WalletPreference;
}

export const PasswordForm: React.FC<PasswordFormProps> = ({
  onSubmit,
  onBack,
  loading = false,
  logo,
  backgroundImage,
  showWalletOptions = true,
  defaultWalletPreference = WalletPreference.BACKEND,
}) => {
  const [form] = Form.useForm();
  const [walletPreference, setWalletPreference] = useState<WalletPreference>(defaultWalletPreference);

  const handleSubmit = (values: any) => {
    onSubmit({
      ...values,
      walletPreference,
    });
  };

  const onWalletPreferenceChange = (e: any) => {
    setWalletPreference(e.target.value);
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

      {/* Right Section - Password Form */}
      <div className="flex flex-col justify-center items-center w-1/2 bg-white auth-pages">
        <Card
          title={<span className="text-black">Create Password</span>}
          style={{
            width: "550px",
            border: "1px solid #BBBBBB",
          }}
          className="signup-card bg-white"
        >
          <Form layout="vertical" form={form} onFinish={handleSubmit}>
            {/* Password */}
            <Form.Item
              name="password"
              label={<span className="text-[#1F1F1F]">Password</span>}
              rules={[
                {
                  required: true,
                  message: "Please input your password!",
                },
                {
                  min: 8,
                  message: "Password must be at least 8 characters long!",
                },
              ]}
              hasFeedback
            >
              <Input.Password
                placeholder="Create a strong password"
                style={{
                  color: "#1F1F1F",
                  backgroundColor: "transparent",
                  border: "1px solid #BBBBBB",
                }}
                className="signup-input"
              />
            </Form.Item>

            {/* Confirm Password */}
            <Form.Item
              name="confirmPassword"
              label={<span className="text-[#1F1F1F]">Confirm Password</span>}
              dependencies={["password"]}
              hasFeedback
              rules={[
                {
                  required: true,
                  message: "Please confirm your password!",
                },
                ({ getFieldValue }: any) => ({
                  validator(_: any, value: any) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("The two passwords do not match!"));
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder="Confirm your password"
                style={{
                  color: "#1F1F1F",
                  backgroundColor: "transparent",
                  border: "1px solid #BBBBBB",
                }}
                className="signup-input"
              />
            </Form.Item>

            {/* Wallet Preference */}
            {showWalletOptions && (
              <Form.Item label={<span className="text-[#1F1F1F]">Wallet Preference</span>}>
                <Radio.Group
                  onChange={onWalletPreferenceChange}
                  value={walletPreference}
                  className="wallet-preference-radio-group"
                >
                  <Radio value={WalletPreference.BACKEND} className="wallet-preference-radio">
                    <div>
                      <div className="font-semibold">Backend Managed Wallet</div>
                      <div className="text-sm text-gray-600">
                        Let us manage your wallet securely
                      </div>
                    </div>
                  </Radio>
                  <Radio value={WalletPreference.WEB3} className="wallet-preference-radio mt-3">
                    <div>
                      <div className="font-semibold">Web3 Wallet</div>
                      <div className="text-sm text-gray-600">
                        Use your own wallet (MetaMask, etc.)
                      </div>
                    </div>
                  </Radio>
                </Radio.Group>
              </Form.Item>
            )}

            {/* Action Buttons */}
            <Form.Item className="actions">
              <div className="flex justify-between">
                {onBack && (
                  <Button onClick={onBack} disabled={loading}>
                    Back
                  </Button>
                )}
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="signup-button ml-auto"
                >
                  Complete Sign Up
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default PasswordForm;