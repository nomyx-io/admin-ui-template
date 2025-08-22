import React, { useState, useEffect, useCallback } from "react";
import { Form, Input, Button, Card, Space, Divider, message } from "antd";
import UserOutlined from "@ant-design/icons/UserOutlined";
import LockOutlined from "@ant-design/icons/LockOutlined";
import WalletOutlined from "@ant-design/icons/WalletOutlined";
import { createUnifiedLoginForm } from "@nomyx/shared";
// React 19 compatibility workarounds for icons
const UserOutlinedIcon = UserOutlined as any;
const LockOutlinedIcon = LockOutlined as any;
const WalletOutlinedIcon = WalletOutlined as any;

// Create UnifiedLoginForm with all required dependencies
const UnifiedLoginForm = createUnifiedLoginForm(React, {
  useState,
  useEffect,
  useForm: Form.useForm,
  Form,
  Input,
  Button,
  Card,
  message,
  Spin: undefined,
  Radio: undefined,
  Space,
  Divider,
  UserOutlined,
  LockOutlined,
  WalletOutlined
}) as React.ComponentType<any>;

interface SimpleAdminLoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onConnect?: (address: string, provider: any) => Promise<void>;
  onWalletConnect?: () => Promise<void>;
  [key: string]: any; // Allow additional props
}

const SimpleAdminLoginForm: React.FC<SimpleAdminLoginFormProps> = ({ onLogin, onConnect, onWalletConnect, ...rest }) => {
  const logo = (
    <img 
      src="/images/nomyx_logo_white.svg" 
      alt="Admin Portal" 
      className="mx-auto mb-4"
      style={{ height: "40px" }}
      onError={(e) => {
        // Fallback if logo not found
        e.currentTarget.style.display = 'none';
      }}
    />
  );

  return (
    <UnifiedLoginForm
      onLogin={onLogin}
      onConnect={onConnect}
      onWalletConnect={onWalletConnect || onConnect}
      title="Admin Portal Login"
      subtitle="Sign in with your administrator credentials"
      showSignUpLink={false}
      showForgotPassword={false}
      logo={logo}
      showWalletConnect={true}
      // Don't set background since it's handled by UnifiedLoginLayout
      backgroundColor="transparent"
      backgroundImage=""
      cardBackgroundColor="rgba(20, 20, 20, 0.95)"
      {...rest}
    />
  );
};

export default SimpleAdminLoginForm;