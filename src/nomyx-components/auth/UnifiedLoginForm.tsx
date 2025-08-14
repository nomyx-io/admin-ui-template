"use client";

// No React imports - completely framework agnostic
import { Form, Input, Button, Card, Space, Divider, message } from "antd";
import { UserOutlined, LockOutlined, WalletOutlined } from "@ant-design/icons";

export interface UnifiedLoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onWalletConnect?: () => Promise<void>;
  title?: string;
  subtitle?: string;
  showSignUpLink?: boolean;
  showForgotPassword?: boolean;
  signUpUrl?: string;
  forgotPasswordUrl?: string;
  selectedChain?: string;
  logo?: any; // ReactNode
  backgroundImage?: string;
  backgroundColor?: string;
  cardBackgroundColor?: string;
  roleMessage?: string;
  showWalletConnect?: boolean;
}

// Factory function that creates the component with injected dependencies
export function createUnifiedLoginForm(React: any, useState: any, useEffect: any, useForm: any, useCallback?: any, ReactDOM?: any) {
  const UnifiedLoginForm: any = ({
    onLogin,
    onWalletConnect,
    title = "Welcome",
    subtitle = "Sign in to continue",
    showSignUpLink = true,
    showForgotPassword = true,
    signUpUrl = "/signup",
    forgotPasswordUrl = "/forgot-password",
    selectedChain = "ethereum-local",
    logo,
    backgroundImage = "/images/nomyx_banner.svg",
    backgroundColor = "#141414",
    cardBackgroundColor = "rgba(20, 20, 20, 0.95)",
    roleMessage,
    showWalletConnect = true,
  }: UnifiedLoginFormProps) => {
    const [loading, setLoading] = useState(false);
    const [walletLoading, setWalletLoading] = useState(false);
    const [form] = useForm();

    const handleSubmit = async (values: { email: string; password: string }) => {
      try {
        setLoading(true);
        await onLogin(values.email, values.password);
      } catch (error: any) {
        message.error(error.message || "Login failed");
      } finally {
        setLoading(false);
      }
    };

    const handleWalletConnect = async () => {
      if (!onWalletConnect) {
        message.error("Wallet connection not configured");
        return;
      }
      
      try {
        setWalletLoading(true);
        await onWalletConnect();
      } catch (error: any) {
        message.error(error.message || "Wallet connection failed");
      } finally {
        setWalletLoading(false);
      }
    };

    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-cover bg-center"
        style={{ 
          backgroundImage: backgroundImage ? `url('${backgroundImage}')` : undefined,
          backgroundColor
        }}
      >
        <Card 
          className="w-full max-w-md shadow-2xl login-card"
          style={{ backgroundColor: cardBackgroundColor }}
        >
          <div className="text-center mb-8">
            {logo && (
              <div className="mb-4">{logo}</div>
            )}
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>{title}</h2>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{subtitle}</p>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Please enter a valid email" }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Email"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Please enter your password" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                Sign In
              </Button>
            </Form.Item>

            {(showForgotPassword || showSignUpLink) && (
              <div className="text-center mb-4">
                <Space split={<span className="text-gray-400">|</span>}>
                  {showForgotPassword && (
                    <a href={forgotPasswordUrl} style={{ color: '#3b82f6' }}>Forgot Password?</a>
                  )}
                  {showSignUpLink && (
                    <a href={signUpUrl} style={{ color: '#3b82f6' }}>Create Account</a>
                  )}
                </Space>
              </div>
            )}
          </Form>

          {showWalletConnect && onWalletConnect && (
            <>
              <Divider plain>
                <span style={{ color: '#6b7280' }}>OR</span>
              </Divider>

              <Space direction="vertical" className="w-full">
                {selectedChain && selectedChain.includes("ethereum") ? (
                  <Button
                    icon={<WalletOutlined />}
                    onClick={handleWalletConnect}
                    loading={walletLoading}
                    block
                    size="large"
                    className="flex items-center justify-center"
                  >
                    <span className="flex items-center">
                      <img 
                        src="/images/metamask-logo.svg" 
                        alt="MetaMask" 
                        className="w-5 h-5 mr-2"
                        onError={(e: any) => { e.currentTarget.style.display = 'none' }}
                      />
                      Connect with MetaMask
                    </span>
                  </Button>
                ) : selectedChain && selectedChain.includes("stellar") ? (
                  <Button
                    icon={<WalletOutlined />}
                    onClick={handleWalletConnect}
                    loading={walletLoading}
                    block
                    size="large"
                    className="flex items-center justify-center"
                  >
                    <span className="flex items-center">
                      <img 
                        src="/images/freighter-logo.svg" 
                        alt="Freighter" 
                        className="w-5 h-5 mr-2"
                        onError={(e: any) => { e.currentTarget.style.display = 'none' }}
                      />
                      Connect with Freighter
                    </span>
                  </Button>
                ) : (
                  <Button
                    icon={<WalletOutlined />}
                    onClick={handleWalletConnect}
                    loading={walletLoading}
                    block
                    size="large"
                  >
                    Connect Wallet
                  </Button>
                )}
              </Space>
            </>
          )}

          {roleMessage && (
            <div className="mt-4 text-center">
              <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                {roleMessage}
              </span>
            </div>
          )}
        </Card>
      </div>
    );
  };

  return UnifiedLoginForm;
}

export default createUnifiedLoginForm;