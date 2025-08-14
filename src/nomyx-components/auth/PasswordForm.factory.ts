import { ReactLike, ComponentFactory, WalletPreference } from '../../types/component-types';

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
  // Antd form and components
  Form?: any;
  Input?: any;
  Button?: any;
  Radio?: any;
  Card?: any;
}

export const createPasswordForm: ComponentFactory<PasswordFormProps> = (React: ReactLike) => {
  const { useState, useMemo } = React;

  return function PasswordForm(props: PasswordFormProps) {
    const {
      onSubmit,
      onBack,
      loading = false,
      logo,
      backgroundImage,
      showWalletOptions = true,
      defaultWalletPreference = WalletPreference.BACKEND,
      Form,
      Input,
      Button,
      Radio,
      Card
    } = props;

    // Create form instance outside of conditional to satisfy React hooks rules
    const formInstance = useMemo(() => {
      if (Form?.useForm) {
        const [formRef] = Form.useForm();
        return formRef;
      }
      return null;
    }, [Form]);

    const [walletPreference, setWalletPreference] = useState(defaultWalletPreference as WalletPreference);

    const handleSubmit = (values: any) => {
      onSubmit({
        ...values,
        walletPreference,
      });
    };

    const onWalletPreferenceChange = (e: any) => {
      setWalletPreference(e.target.value);
    };

    if (!Form || !Input || !Button || !Radio || !Card) {
      return React.createElement('div', {
        style: { color: 'red', padding: '20px' }
      }, 'Error: Required Ant Design components not provided to PasswordForm');
    }

    return React.createElement('div', {
      className: 'flex h-screen w-full'
    }, [
      // Left Section - Custom Gradient Background and Logo
      React.createElement('div', {
        key: 'left-section',
        className: 'bg-black hidden sm:flex w-1/2 flex-col justify-center items-center gap-10',
        style: backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined
      }, logo && React.createElement('img', {
        src: logo,
        alt: 'Logo',
        className: 'w-40'
      })),

      // Right Section - Form
      React.createElement('div', {
        key: 'right-section',
        className: 'flex items-center justify-center w-full sm:w-1/2 p-8 bg-gray-50'
      }, React.createElement(Card, {
        className: 'w-full max-w-md shadow-lg',
        bodyStyle: { padding: '2rem' }
      }, [
        React.createElement('h2', {
          key: 'title',
          className: 'text-2xl font-bold text-center mb-6 text-gray-800'
        }, 'Create Password'),

        React.createElement(Form, {
          key: 'form',
          form: formInstance,
          layout: 'vertical',
          onFinish: handleSubmit,
          className: 'space-y-4'
        }, [
          React.createElement(Form.Item, {
            key: 'password',
            name: 'password',
            label: 'Password',
            rules: [
              { required: true, message: 'Please enter your password' },
              { min: 8, message: 'Password must be at least 8 characters' }
            ]
          }, React.createElement(Input.Password, {
            placeholder: 'Enter your password',
            size: 'large'
          })),

          React.createElement(Form.Item, {
            key: 'confirmPassword',
            name: 'confirmPassword',
            label: 'Confirm Password',
            dependencies: ['password'],
            rules: [
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }: any) => ({
                validator(_: any, value: any) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]
          }, React.createElement(Input.Password, {
            placeholder: 'Confirm your password',
            size: 'large'
          })),

          showWalletOptions && React.createElement(Form.Item, {
            key: 'walletPreference',
            label: 'Wallet Preference'
          }, React.createElement(Radio.Group, {
            onChange: onWalletPreferenceChange,
            value: walletPreference,
            className: 'w-full'
          }, [
            React.createElement(Radio, {
              key: 'backend',
              value: WalletPreference.BACKEND,
              className: 'mb-2'
            }, 'Backend Wallet (Recommended)'),
            React.createElement(Radio, {
              key: 'web3',
              value: WalletPreference.WEB3
            }, 'Web3 Wallet (MetaMask, etc.)')
          ])),

          React.createElement('div', {
            key: 'buttons',
            className: 'flex gap-4 pt-4'
          }, [
            onBack && React.createElement(Button, {
              key: 'back',
              onClick: onBack,
              size: 'large',
              className: 'flex-1'
            }, 'Back'),
            React.createElement(Button, {
              key: 'submit',
              type: 'primary',
              htmlType: 'submit',
              loading: loading,
              size: 'large',
              className: 'flex-1'
            }, 'Create Account')
          ])
        ])
      ]))
    ]);
  };
};