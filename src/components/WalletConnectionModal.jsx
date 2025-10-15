import React, { useState } from 'react';
import { Modal, Button, Typography, Space, Alert } from 'antd';
import { WalletOutlined, LinkOutlined } from '@ant-design/icons';
import { BlockchainServiceManager } from '@nomyx/shared';

const { Text, Title } = Typography;

/**
 * WalletConnectionModal - Modal prompt for wallet connection
 * 
 * This modal appears when a user attempts a blockchain operation without
 * a connected wallet. It provides options to connect different wallet types
 * and handles the connection process.
 */
const WalletConnectionModal = ({ visible, onClose, onConnect }) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const manager = BlockchainServiceManager.getInstance();
  
  const handleConnect = async (walletType) => {
    setConnecting(true);
    setError(null);

    try {
      console.log(`[WalletConnectionModal] Connecting ${walletType} wallet...`);

      // NEW WALLET-AGNOSTIC API
      // 1. Import wallet provider factory
      const { WalletProviderFactory } = await import('@nomyx/shared');

      // 2. Get wallet provider for the specified type
      const provider = WalletProviderFactory.getProvider(walletType);

      // 3. Connect the wallet (triggers WebAuthn/extension popup)
      const currentChain = manager.getCurrentChain();
      await provider.connect(currentChain.chainType || currentChain.chain);

      // 4. Set the connected provider as the signer
      const walletInfo = await manager.setSigner(provider);

      if (walletInfo) {
        console.log(`[WalletConnectionModal] Wallet connected successfully:`, walletInfo.address);

        // Notify parent component of successful connection
        if (onConnect) {
          onConnect(walletInfo);
        }

        // Close modal
        onClose(true);
      } else {
        throw new Error('Failed to connect wallet');
      }
    } catch (err) {
      console.error('[WalletConnectionModal] Connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };
  
  const getCurrentChain = () => {
    const chainId = manager.getCurrentChainId();
    if (!chainId) return 'Unknown';
    
    if (chainId.includes('ethereum')) return 'Ethereum';
    if (chainId.includes('stellar')) return 'Stellar';
    return chainId;
  };
  
  const getWalletOptions = () => {
    const chainId = manager.getCurrentChainId();
    const isEthereum = chainId?.includes('ethereum');
    const isStellar = chainId?.includes('stellar');
    const isLocal = chainId?.includes('local');
    
    const options = [];
    
    // Always show DEV wallet for local development
    if (isLocal) {
      options.push({
        type: 'dev',
        name: 'DEV Wallet',
        description: 'Development wallet for testing',
        icon: '🔧'
      });
    }
    
    // Show chain-specific wallets
    if (isEthereum) {
      options.push({
        type: 'metamask',
        name: 'MetaMask',
        description: 'Popular Ethereum wallet',
        icon: '🦊'
      });
    }
    
    if (isStellar) {
      options.push({
        type: 'freighter',
        name: 'Freighter',
        description: 'Stellar wallet by SDF',
        icon: '🚀'
      });
    }
    
    return options;
  };
  
  return (
    <Modal
      title={
        <Space>
          <WalletOutlined />
          <span>Wallet Connection Required</span>
        </Space>
      }
      open={visible}
      onCancel={() => onClose(false)}
      footer={null}
      width={500}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="Blockchain Operation Requires Wallet"
          description="You must connect a wallet to perform blockchain transactions such as creating identities, adding claim topics, or managing trusted issuers."
          type="warning"
          showIcon
        />
        
        <div>
          <Text strong>Current Network: </Text>
          <Text>{getCurrentChain()}</Text>
        </div>
        
        <div>
          <Title level={5}>Select a Wallet to Connect:</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            {getWalletOptions().map(wallet => (
              <Button
                key={wallet.type}
                type="default"
                size="large"
                block
                loading={connecting}
                disabled={connecting}
                onClick={() => handleConnect(wallet.type)}
                icon={<span style={{ marginRight: 8 }}>{wallet.icon}</span>}
              >
                <div style={{ textAlign: 'left' }}>
                  <div><strong>{wallet.name}</strong></div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>{wallet.description}</div>
                </div>
              </Button>
            ))}
          </Space>
        </div>
        
        {error && (
          <Alert
            message="Connection Failed"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}
        
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => onClose(false)} disabled={connecting}>
            Cancel
          </Button>
        </div>
      </Space>
    </Modal>
  );
};

export default WalletConnectionModal;