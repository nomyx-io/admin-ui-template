import { useContext, useEffect, useRef } from "react";

import { Card, Form, Input, Button } from "antd";
import { useNavigate } from "react-router-dom";

import logoDark from "../assets/nomyx_logo_dark.png";
import { RoleContext } from "../context/RoleContext";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const { role } = useContext(RoleContext);
  const previousRole = useRef(role);

  useEffect(() => {
    if (previousRole.current !== role) {
      let newRedirectionUrl = "/";

      if (role.includes("CentralAuthority")) {
        newRedirectionUrl = "/";
      } else if (role.includes("TrustedIssuer")) {
        newRedirectionUrl = "/identities";
      }
      navigate(newRedirectionUrl, { replace: true });
      previousRole.current = role;
    }
  }, [role, navigate]);

  const handleStandardLogin = async (values) => {
    const { email, password } = values;
    await onLogin(email, password);
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
      <h1 className="text-right font-bold text-xl mb-4 w-full mt-8 !-ml-10 text-white">NomyxID</h1>
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left Side */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 md:px-6 my-10">
          <div className="w-full max-w-2xl">
            <img src={logoDark} alt="Logo" width={630} height={240} priority />
          </div>
        </div>

        <div className="max-[550px]:hidden w-1/2 flex flex-col justify-center items-center p-2">
          {/* Right Side */}
          <div className="w-full lg:w-3/4 flex items-center justify-center px-4 md:px-6">
            <div className="bg-nomyxDark1 bg-opacity-90 text-nomyxWhite shadow-lg rounded-lg p-4 max-w-2xl w-full">
              <div className="w-full flex flex-col justify-center items-center">
                <Card
                  title={<span className="text-white">Sign In</span>}
                  style={{
                    width: "100%",
                    maxWidth: "550px",
                    border: "none",
                  }}
                  className="signup-card bg-transparent shadow-lg rounded-lg"
                >
                  <Form layout="vertical" onFinish={handleStandardLogin} className="w-full" initialValues={{ email: "", password: "" }}>
                    <Form.Item
                      name="email"
                      label={<span className="text-gray-400">Email</span>}
                      rules={[
                        {
                          required: true,
                          message: "Please input your Email!",
                          type: "email",
                        },
                      ]}
                    >
                      <Input type="email" placeholder="Enter your email" className="signup-input placeholder-nomyxGray1 !border-nomyxGray1" />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      label={<span className="text-gray-400">Password</span>}
                      rules={[
                        {
                          required: true,
                          message: "Please input your Password!",
                        },
                      ]}
                    >
                      <Input type="password" placeholder="Enter your password" className="signup-input placeholder-nomyxGray1 !border-nomyxGray1" />
                    </Form.Item>

                    <Form.Item>
                      <div className="flex justify-end">
                        <Button type="primary" htmlType="submit" className="signup-button">
                          Log in
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
    </div>
  );
}
