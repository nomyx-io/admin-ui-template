import React from 'react';
import Modal from 'antd/es/modal';
import Button from 'antd/es/button';
import { WalletOutlined } from '@ant-design/icons';

// React 19 compatibility workarounds
const ModalComponent = Modal as any;
const ButtonComponent = Button as any;

interface WalletConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConnect?: () => void;
  message?: string;
  chainName?: string;
}

const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  visible,
  onClose,
  onConnect,
  message = 'Please connect your wallet to continue with this transaction.',
  chainName = ''
}) => {
  const handleConnect = () => {
    onClose();
    if (onConnect) {
      onConnect();
    }
  };

  return (
    <ModalComponent
      title={
        <div className="flex items-center gap-2">
          <WalletOutlined className="text-2xl text-orange-600" />
          <span className="text-xl font-semibold">Wallet Connection Required</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={450}
    >
      <div className="p-4">
        <div className="mb-6 text-center">
          <div className="mb-4">
            <WalletOutlined className="text-6xl text-orange-500" />
          </div>
          <p className="text-base text-gray-700 mb-2">
            {message}
          </p>
          {chainName && (
            <p className="text-sm text-gray-500">
              Selected Chain: <span className="font-medium">{chainName}</span>
            </p>
          )}
        </div>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>How to connect:</strong>
            <ol className="mt-2 ml-4 list-decimal">
              <li>Click the "Connect Wallet" button in the header</li>
              <li>Select your preferred wallet provider</li>
              <li>Approve the connection request in your wallet</li>
              <li>Try your transaction again</li>
            </ol>
          </p>
        </div>

        <div className="flex gap-3">
          <ButtonComponent
            block
            size="large"
            onClick={onClose}
          >
            Cancel
          </ButtonComponent>
          {onConnect && (
            <ButtonComponent
              block
              type="primary"
              size="large"
              onClick={handleConnect}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Go to Connect Wallet
            </ButtonComponent>
          )}
        </div>
      </div>
    </ModalComponent>
  );
};

export default WalletConnectionModal;