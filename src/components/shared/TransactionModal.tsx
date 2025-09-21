import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Space, Typography, Spin, Result } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { createExplorerLink, ExplorerLinkProps } from '@nomyx/shared';

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

// Create the ExplorerLink component
const ExplorerLink = createExplorerLink(React, { useMemo });

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
  // Get explorer helpers from BlockchainSelectionManager
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  useEffect(() => {
    // Try to get explorer URL from the blockchain service
    const getExplorerUrl = async () => {
      try {
        const { BlockchainServiceManager } = await import('@nomyx/shared');
        const manager = BlockchainServiceManager.getInstance();
        const currentChain = manager.getCurrentChain();
        // Check for chain_explorer_url directly on the chain object
        if (currentChain?.chain_explorer_url) {
          setExplorerUrl(currentChain.chain_explorer_url);
        }
      } catch (error) {
        console.log('Failed to get explorer URL:', error);
      }
    };
    getExplorerUrl();
  }, []);
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
                      marginTop: '16px',
                      maxWidth: '100%',
                      overflow: 'hidden'
                    }} className="bg-nomyx-gray4-light dark:bg-nomyx-gray4-dark">
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {Object.entries(data).map(([key, value]) => {
                          const stringValue = String(value);
                          const isHash = key.toLowerCase().includes('hash') || key.toLowerCase().includes('txhash') || key.toLowerCase().includes('transactionhash');
                          const isAddress = !isHash && (key.toLowerCase().includes('address') || key.toLowerCase().includes('contract'));
                          const isAmount = typeof value === 'number' && key.toLowerCase().includes('amount');

                          // Format amount values
                          const displayValue = isAmount ? `$${value.toLocaleString()}` : stringValue;

                          return (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                              <Text strong className="text-nomyx-text-light dark:text-nomyx-text-dark" style={{ flexShrink: 0, minWidth: '100px', wordBreak: 'keep-all' }}>
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                              </Text>
                              <div style={{ textAlign: 'right', flex: 1, maxWidth: '300px' }}>
                                {isHash && explorerUrl ? (
                                  <ExplorerLink
                                    type="transaction"
                                    value={stringValue}
                                    explorerUrl={explorerUrl}
                                    className="text-nomyx-text-light dark:text-nomyx-text-dark"
                                    truncate={true}
                                    showIcon={true}
                                  />
                                ) : isAddress && explorerUrl ? (
                                  <ExplorerLink
                                    type={key.toLowerCase().includes('contract') ? 'contract' : 'address'}
                                    value={stringValue}
                                    explorerUrl={explorerUrl}
                                    className="text-nomyx-text-light dark:text-nomyx-text-dark"
                                    truncate={true}
                                    showIcon={true}
                                  />
                                ) : (
                                  <Text
                                    className="text-nomyx-text-light dark:text-nomyx-text-dark"
                                    copyable={(isHash || isAddress) ? { text: stringValue } : false}
                                    style={{ wordBreak: 'break-all' }}
                                    title={(isHash || isAddress) ? stringValue : undefined}
                                  >
                                    {(isHash || isAddress) && stringValue.length > 20
                                      ? `${stringValue.substring(0, 8)}...${stringValue.substring(stringValue.length - 8)}`
                                      : displayValue}
                                  </Text>
                                )}
                              </div>
                            </div>
                          );
                        })}
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