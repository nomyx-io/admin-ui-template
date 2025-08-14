# Shared Authentication Components

This directory contains reusable authentication components for Nomyx portals. These components provide a consistent authentication experience across all portals while allowing for customization.

## Components

### LoginPage

A flexible login component supporting both standard (email/password) and wallet-based authentication.

```tsx
import { LoginPage } from "nomyx-ts/dist/frontend";

<LoginPage
  // Branding
  logoLight="/path/to/logo-light.png"
  logoDark="/path/to/logo-dark.png"
  appName="My Portal"
  backgroundImage="/path/to/background.jpg"
  
  // Authentication handlers
  onLogin={async (email, password) => {
    // Handle standard login
  }}
  onConnect={async (address, provider) => {
    // Handle wallet connection
  }}
  onDisconnect={() => {
    // Handle disconnect
  }}
  onNavigate={(path, replace) => {
    // Handle navigation
  }}
  
  // Blockchain configuration
  selectedChainId="ethereum-mainnet"
  onChainChange={(chainId) => {
    // Handle chain change
  }}
  
  // User state
  role={["Admin", "User"]}
  forceLogout={false}
  
  // UI customization
  showSignUpLink={true}
  signUpPath="/register"
  showForgotPassword={true}
  forgotPasswordPath="/forgot-password"
  loginPreferences={[LoginPreference.USERNAME_PASSWORD, LoginPreference.WALLET]}
  defaultLoginPreference={LoginPreference.USERNAME_PASSWORD}
  
  // Role-based redirects
  roleRedirects={{
    Admin: "/admin",
    User: "/dashboard",
  }}
/>
```

### Protected

Role-based access control wrapper for routes.

```tsx
import { Protected } from "nomyx-ts/dist/frontend";

<Protected 
  role="Admin" 
  roles={userRoles}
  redirectTo="/login"
  onNavigate={handleNavigate}
>
  <AdminComponent />
</Protected>
```

### AutoLogout

Session timeout management component.

```tsx
import { AutoLogout } from "nomyx-ts/dist/frontend";

<AutoLogout
  tokenExpirationKey="tokenExpiration"
  sessionTokenKey="sessionToken"
  onLogout={() => {
    // Custom logout logic
  }}
  redirectPath="/login"
  checkInterval={1000}
/>
```

### SignUpForm & PasswordForm

Registration flow components that can be used together or separately.

```tsx
import { CreatePasswordPage } from "nomyx-ts/dist/frontend";

<CreatePasswordPage
  logo="/path/to/logo.png"
  backgroundImage="/path/to/background.jpg"
  onNavigate={handleNavigate}
  signInPath="/login"
  onSignUp={async (data) => {
    // Handle complete sign up
    console.log(data); // { firstName, lastName, email, company, password, walletPreference }
  }}
  showOnboardingLink={true}
  showWalletOptions={true}
  defaultWalletPreference={WalletPreference.BACKEND}
/>
```

## Integration Example

Here's a complete example of integrating these components into a React application:

```tsx
// App.tsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { 
  LoginPage, 
  Protected, 
  AutoLogout,
  CreatePasswordPage,
  LoginPreference,
  WalletPreference 
} from "nomyx-ts/dist/frontend";

function App() {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleLogin = async (email: string, password: string) => {
    // Call your authentication API
    const response = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    setUser(data.user);
    setRoles(data.roles);
  };

  const handleNavigate = (path: string, replace?: boolean) => {
    navigate(path, { replace });
  };

  return (
    <>
      <AutoLogout onLogout={() => setUser(null)} />
      
      <Routes>
        <Route path="/login" element={
          <LoginPage
            onLogin={handleLogin}
            onNavigate={handleNavigate}
            role={roles}
            // ... other props
          />
        } />
        
        <Route path="/signup" element={
          <CreatePasswordPage
            onSignUp={async (data) => {
              // Handle registration
            }}
            onNavigate={handleNavigate}
          />
        } />
        
        <Route path="/admin/*" element={
          <Protected role="Admin" roles={roles} onNavigate={handleNavigate}>
            <AdminRoutes />
          </Protected>
        } />
      </Routes>
    </>
  );
}
```

## Customization

All components support extensive customization through props:

- **Branding**: Logos, app name, background images
- **Authentication Methods**: Enable/disable standard login, wallet connection
- **UI Elements**: Show/hide sign up links, forgot password, etc.
- **Role-Based Access**: Configure role redirects and protected routes
- **Styling**: Components use standard CSS classes that can be overridden

## TypeScript Support

All components are written in TypeScript and export their prop types for better development experience.

## Peer Dependencies

Make sure your application has the following peer dependencies installed:

- `react` >= 18.3.1
- `antd` >= 5.0.0
- `react-toastify` >= 9.0.0
- `react-router-dom` (for navigation)

## Migration Guide

To migrate from portal-specific authentication components:

1. Install or update `nomyx-ts` to the latest version
2. Replace local authentication components with shared ones
3. Update imports to use `nomyx-ts/dist/frontend`
4. Adjust props to match your portal's needs
5. Test authentication flows thoroughly