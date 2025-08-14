import React from "react";

interface LoginLayoutProps {
  children: React.ReactNode;
}

/**
 * Login layout with gradient background for admin portal
 */
const LoginLayout: React.FC<LoginLayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #2E3192 0%, #1BFFFF 100%)",
      }}
    >
      {/* Background overlay with SVG pattern */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: "url('/images/nomyx_banner.svg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />
      
      {/* Content container */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default LoginLayout;