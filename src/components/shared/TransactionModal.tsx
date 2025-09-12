import React from 'react';
import { Modal, Space, Typography, Spin, Result } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export interface TransactionModalProps {
  visible: boolean;
  status: 'loading' | 'success' | 'error';
  title?: string;
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  data?: Record<string, any>;
  onClose?: () => void;
  autoCloseDelay?: number; // milliseconds
  showDetails?: boolean;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  status,
  title = 'Transaction',
  loadingMessage = 'Processing transaction...',
  successMessage = 'Transaction completed successfully!',
  errorMessage,
  data,
  onClose,
  autoCloseDelay = 3000,
  showDetails = true
}) => {
  // Auto-close on success after specified delay
  React.useEffect(() => {
    if (status === 'success' && onClose && autoCloseDelay > 0) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [status, onClose, autoCloseDelay]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />}
              size="large"
            />
            <Title level={3} style={{ marginTop: 24, marginBottom: 8 }} className="text-nomyx-text-light dark:text-nomyx-text-dark">
              {title}
            </Title>
            <Text type="secondary" className="text-nomyx-gray1-light dark:text-nomyx-gray1-dark">
              {loadingMessage}
            </Text>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }} className="text-nomyx-gray1-light dark:text-nomyx-gray1-dark">
                This may take a few moments
              </Text>
            </div>
          </div>
        );

      case 'success':
        return (
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 72 }} />}
            status="success"
            title={successMessage}
            subTitle={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {data && showDetails && (
                  <>
                    <div style={{ 
                      padding: '16px', 
                      borderRadius: '8px',
                      marginTop: '16px'
                    }} className="bg-nomyx-gray4-light dark:bg-nomyx-gray4-dark">
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {Object.entries(data).map(([key, value]) => (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                            <Text strong className="text-nomyx-text-light dark:text-nomyx-text-dark" style={{ flexShrink: 0 }}>
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                            </Text>
                            <Text 
                              className="text-nomyx-text-light dark:text-nomyx-text-dark"
                              copyable={key.toLowerCase().includes('hash') || key.toLowerCase().includes('id') || key.toLowerCase().includes('address')}
                              ellipsis={key.toLowerCase().includes('hash') || key.toLowerCase().includes('address') ? { suffix: '' } : false}
                              style={
                                key.toLowerCase().includes('hash') || key.toLowerCase().includes('address') 
                                  ? { maxWidth: '250px', wordBreak: 'break-all' } 
                                  : { wordBreak: 'break-word' }
                              }
                            >
                              {typeof value === 'number' && key.toLowerCase().includes('amount') 
                                ? `$${value.toLocaleString()}` 
                                : String(value)}
                            </Text>
                          </div>
                        ))}
                      </Space>
                    </div>
                  </>
                )}
              </Space>
            }
          />
        );

      case 'error':
        return (
          <Result
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 72 }} />}
            status="error"
            title="Transaction Failed"
            subTitle={
              <Space direction="vertical" size="small">
                <Text className="text-nomyx-text-light dark:text-nomyx-text-dark">
                  {errorMessage || 'An error occurred during the transaction'}
                </Text>
                {errorMessage && errorMessage.includes('blockchain') && (
                  <Text type="secondary" style={{ fontSize: 12 }} className="text-nomyx-gray1-light dark:text-nomyx-gray1-dark">
                    Please check your wallet connection and try again
                  </Text>
                )}
              </Space>
            }
          />
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      open={visible}
      centered
      closable={status !== 'loading'}
      onCancel={onClose}
      footer={null}
      width={560}
      styles={{
        body: { 
          padding: '24px',
          minHeight: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }}
      maskClosable={false}
      destroyOnHidden={true}
    >
      {renderContent()}
    </Modal>
  );
};

export default TransactionModal;