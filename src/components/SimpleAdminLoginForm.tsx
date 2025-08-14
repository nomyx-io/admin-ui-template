import React, { useState, useEffect, useCallback } from "react";
import { Form, Input, Button, Card, Space, Divider, message } from "antd";
import { UserOutlined, LockOutlined, WalletOutlined } from "@ant-design/icons";
import { createUnifiedLoginForm } from "@nomyx/shared";

// Create UnifiedLoginForm with all required dependencies
const UnifiedLoginForm = createUnifiedLoginForm(
  React,
  useState,
  useEffect,
  Form.useForm,
  Form,
  Input,
  Button,
  Card,
  Space,
  Divider,
  message,
  UserOutlined,
  LockOutlined,
  WalletOutlined
);

interface SimpleAdminLoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onWalletConnect?: () => Promise<void>;
  [key: string]: any; // Allow additional props
}

const SimpleAdminLoginForm: React.FC<SimpleAdminLoginFormProps> = ({ onLogin, onWalletConnect, ...rest }) => {
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
      onWalletConnect={onWalletConnect}
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
    />
  );
};

export default SimpleAdminLoginForm;