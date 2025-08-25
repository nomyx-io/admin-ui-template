// Temporary fix for Ant Design components with React 19
// This overrides the component types to be compatible with React 19's new ReactNode type

import React from 'react';

declare module 'antd' {
  export const Spin: React.FC<any>;
  export const Result: React.FC<any>;
  export const Button: React.FC<any>;
  export const Form: React.FC<any>;
  export const Input: React.FC<any>;
  export const Select: React.FC<any>;
  export const Card: React.FC<any>;
  export const Table: React.FC<any>;
  export const Modal: React.FC<any>;
  export const Dropdown: React.FC<any>;
  export const Menu: React.FC<any>;
  export const Space: React.FC<any>;
  export const Typography: React.FC<any>;
  export const Divider: React.FC<any>;
  export const message: any;
  export const notification: any;
}