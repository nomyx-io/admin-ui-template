// Export theme styles
export const themeStyles = `
/* Nomyx Theme Variables - Embedded version for direct import */
:root {
  /* Primary Colors */
  --nomyx-primary-color: #1568DB;
  --nomyx-primary-hover: #1257c0;
  --nomyx-primary-active: #0f4aa0;
  
  /* Background Colors */
  --nomyx-background-color: #f9fafb;
  --nomyx-surface-color: #ffffff;
  
  /* Border Colors */
  --nomyx-border-color: #e5e7eb;
  --nomyx-border-hover: #d1d5db;
  
  /* Text Colors */
  --nomyx-text-color: #111827;
  --nomyx-text-secondary: #6b7280;
  
  /* Status Colors */
  --nomyx-success-color: #10b981;
  --nomyx-error-color: #ef4444;
  --nomyx-warning-color: #f59e0b;
  --nomyx-info-color: #3b82f6;
  
  /* Dark Mode Colors */
  --nomyx-dark-background-color: #374151;
  --nomyx-dark-surface-color: #1f2937;
  --nomyx-dark-border-color: #4b5563;
  --nomyx-dark-text-color: #f9fafb;
  --nomyx-dark-text-secondary: #d1d5db;
}

/* Animation for the connected indicator */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

/* Animation for loading spinner */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive design for mobile */
@media (max-width: 640px) {
  .chain-dropdown-container button {
    font-size: 12px !important;
    padding: 6px 10px !important;
    height: 28px !important;
  }
  
  .chain-dropdown-container svg {
    width: 10px !important;
    height: 10px !important;
  }
  
  .wallet-dropdown-container button {
    font-size: 12px !important;
    padding: 6px 10px !important;
    height: 28px !important;
  }
}
`;

// Function to inject theme styles into the document
export function injectThemeStyles() {
  if (typeof document === 'undefined') return;
  
  const styleId = 'nomyx-theme-styles';
  
  // Check if styles are already injected
  if (document.getElementById(styleId)) return;
  
  // Create and inject style element
  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = themeStyles;
  document.head.appendChild(styleElement);
}