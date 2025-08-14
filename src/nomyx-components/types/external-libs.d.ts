// Stub declarations for external libraries to resolve compilation errors

declare module 'antd' {
    export const Spin: any;
    export const Layout: any;
    export const Card: any;
    export const Radio: any;
    export const Form: any;
    export const Input: any;
    export const Button: any;
    export const Space: any;
    export const Divider: any;
    export const message: any;
}

declare module '@ant-design/icons' {
    export const UserOutlined: any;
    export const LockOutlined: any;
    export const WalletOutlined: any;
}

declare module 'react-toastify' {
    export const toast: {
        success: (message: string) => void;
        error: (message: string) => void;
        info: (message: string) => void;
        warning: (message: string) => void;
    };
} 