import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Spin, Button, Input, Space } from "antd";
import Transfer from "antd/es/transfer";
import { toast } from "react-toastify";
import ArrowLeftOutlined from "@ant-design/icons/ArrowLeftOutlined";
// React 19 compatibility workarounds for icons
const ArrowLeftOutlinedIcon = ArrowLeftOutlined as any;
import { useBlockchainService } from "../../../hooks/useBlockchainService";
import { BlockchainServiceManager } from "@nomyx/shared";
import AppLayout from "../../../components/AppLayout";
import PageCard from "../../../components/shared/PageCard";
import TransactionModal from "../../../components/shared/TransactionModal";
import WalletConnectionModal from "../../../components/WalletConnectionModal";

export default function EditIssuerPage() {
  const router = useRouter();
  const { id } = router.query;
  const { blockchainService, loading, error } = useBlockchainService();
  const [issuerData, setIssuerData] = useState<any>(null);
  const [verifierName, setVerifierName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [claimTopics, setClaimTopics] = useState([]);
  const [targetKeys, setTargetKeys] = useState<number[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [transactionModal, setTransactionModal] = useState({
    visible: false,
    status: 'loading' as 'loading' | 'success' | 'error',
    title: 'Updating Trusted Issuer',
    loadingMessage: 'Updating issuer claim topics on blockchain...',
    successMessage: '',
    errorMessage: ''
  });

  // Get wallet state from BlockchainServiceManager
  const manager = BlockchainServiceManager.getInstance();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const updateWalletState = () => {
      if (manager && manager.isServiceInitialized()) {
        setIsConnected(manager.isWalletConnected());
      }
    };

    updateWalletState();

    // Listen for wallet events
    const handleWalletUpdate = () => updateWalletState();
    manager.on('wallet:connected', handleWalletUpdate);
    manager.on('wallet:disconnected', handleWalletUpdate);

    return () => {
      manager.off('wallet:connected', handleWalletUpdate);
      manager.off('wallet:disconnected', handleWalletUpdate);
    };
  }, []);

  useEffect(() => {
    const loadIssuerData = async () => {
      if (blockchainService && id) {
        try {
          // ID is the issuer address - fetch all issuers and find the matching one
          const decodedAddress = decodeURIComponent(id as string);
          const allIssuers = await blockchainService.getTrustedIssuers();

          // Find the issuer with matching address
          const normalizedAddress = decodedAddress.toUpperCase();
          const issuer = allIssuers?.find((i: any) => {
            const issuerAddr = (i.issuerAddress || '').toUpperCase();
            return issuerAddr === normalizedAddress;
          });

          if (issuer) {
            setIssuerData(issuer);
            setVerifierName(issuer.name || "");
            setWalletAddress(issuer.issuerAddress || "");
            setTargetKeys(issuer.claimTopics || []);
          } else {
            console.error("Issuer not found with address:", decodedAddress);
            toast.error("Issuer not found");
          }

          // Load all available claim topics
          let result = null;
          if (blockchainService.getClaimTopicsDetailed && typeof blockchainService.getClaimTopicsDetailed === 'function') {
            result = await blockchainService.getClaimTopicsDetailed();
          } else if (blockchainService.getClaimTopics && typeof blockchainService.getClaimTopics === 'function') {
            result = await blockchainService.getClaimTopics();
          }

          let data: any[] = [];
          if (result) {
            if (Array.isArray(result) && result.length > 0) {
              if (typeof result[0] === "number") {
                // Basic format: array of numbers
                result.forEach((topicId: number) => {
                  data.push({
                    key: topicId,
                    displayName: `Topic ${topicId}`,
                    id: topicId.toString(),
                    topic: topicId,
                  });
                });
              } else if (result[0].name !== undefined || result[0].displayName !== undefined) {
                // Detailed format
                result.forEach((item: any) => {
                  const displayName = item.displayName || item.name || `Topic ${item.id}`;
                  data.push({
                    key: item.id,
                    displayName: displayName,
                    id: item.id.toString(),
                    topic: item.id,
                  });
                });
              }
            }
            setClaimTopics(data);
          }
        } catch (error) {
          console.error("Error loading issuer data:", error);
          toast.error("Failed to load issuer data");
        }
      }
    };

    loadIssuerData();
  }, [blockchainService, id]);

  const onChange = (nextTargetKeys: any, direction: any, moveKeys: any) => {
    setTargetKeys(nextTargetKeys);
  };

  const onSelectChange = (sourceSelectedKeys: any, targetSelectedKeys: any) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  const validateUpdate = () => {
    if (targetKeys.length < 1) {
      toast.error("Assign at least 1 Compliance Rule");
      return false;
    }
    return true;
  };

  const updateIssuer = async () => {
    if (!validateUpdate()) {
      return;
    }

    // For local development, we can proceed without wallet connection
    const isLocalDev = typeof window !== 'undefined' &&
                       (window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1');

    if (!isLocalDev && !isConnected) {
      toast.error("Please connect your wallet first");
      setWalletModalVisible(true);
      return;
    }

    try {
      // Show transaction modal
      setTransactionModal({
        visible: true,
        status: 'loading',
        title: 'Updating Trusted Issuer',
        loadingMessage: 'Updating issuer claim topics on blockchain...',
        successMessage: '',
        errorMessage: ''
      });

      const result = await blockchainService?.updateIssuerClaimTopics(
        walletAddress,
        targetKeys
      );

      console.log(`[EditIssuer] Update result:`, result);

      // Check if wallet connection is required
      if (result && result.requiresWallet) {
        console.log('[EditIssuer] Wallet connection required');
        setTransactionModal({ ...transactionModal, visible: false });
        setWalletModalVisible(true);
        return;
      }

      if (!result || (!result.success && !result.txHash && !result.transactionHash)) {
        throw new Error('Transaction did not return a success confirmation');
      }

      // Add a small delay to ensure blockchain state is updated
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Show success
      setTransactionModal({
        visible: true,
        status: 'success',
        title: 'Success',
        loadingMessage: '',
        successMessage: `Successfully updated claim topics for issuer ${walletAddress}`,
        errorMessage: ''
      });

      // Navigate after a short delay
      setTimeout(() => {
        router.push("/issuers");
      }, 2000);

    } catch (error: any) {
      console.error("Error updating issuer:", error);
      setTransactionModal({
        visible: true,
        status: 'error',
        title: 'Error',
        loadingMessage: '',
        successMessage: '',
        errorMessage: error.message || `An error occurred while updating issuer claim topics`
      });
    }
  };

  const handleWalletConnect = async (walletInfo: any) => {
    console.log('[EditIssuer] Wallet connected:', walletInfo);
    setWalletModalVisible(false);
    // Retry the operation after wallet connection
    updateIssuer();
  };

  const handleWalletModalClose = (connected: boolean) => {
    setWalletModalVisible(false);
    if (!connected) {
      toast.error("Wallet connection cancelled");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{
          minHeight: "400px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ padding: "24px" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Button
            icon={<ArrowLeftOutlinedIcon />}
            onClick={() => router.push("/issuers")}
          >
            Back to Trusted Issuers
          </Button>

          <PageCard title="Update Trusted Issuer Claim Topics">
            <div>
              <div>
                <label htmlFor="trustedIssuerName">Trusted Issuer display name</label>
                <div className="mt-3 relative w-full flex border rounded-lg">
                  <Input
                    id="trustedIssuerName"
                    value={verifierName}
                    className="border w-full p-2 rounded-lg text-xl"
                    disabled
                    readOnly
                  />
                </div>
              </div>
              <div className="mt-10 mb-6">
                <label htmlFor="trustedIssuerWallet">Trusted Issuer Wallet</label>
                <div className="mt-3 relative w-full flex border rounded-lg">
                  <Input
                    id="trustedIssuerWallet"
                    value={walletAddress}
                    className="border w-full p-2 rounded-lg text-xl"
                    disabled
                    readOnly
                  />
                </div>
                <p className="my-4">Manage Compliance Rule IDs</p>
              </div>
              <div className="my-5">
                <Transfer
                  className="w-full"
                  showSelectAll={false}
                  dataSource={claimTopics}
                  titles={["Available Claims", "Selected Claims"]}
                  targetKeys={targetKeys}
                  selectedKeys={selectedKeys}
                  onChange={onChange}
                  onSelectChange={onSelectChange}
                  render={(item: any) => (
                    <div>
                      {item?.displayName}({item.topic})
                    </div>
                  )}
                  listStyle={{ width: "50%", minWidth: "120px" }}
                />
              </div>
              <div className="flex justify-end max-[600px]:justify-center mt-6">
                <Button
                  className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white"
                  onClick={updateIssuer}
                >
                  Update Claim Topics
                </Button>
              </div>
            </div>

            {/* Transaction Modal */}
            <TransactionModal
              visible={transactionModal.visible}
              status={transactionModal.status}
              title={transactionModal.title}
              loadingMessage={transactionModal.loadingMessage}
              successMessage={transactionModal.successMessage}
              errorMessage={transactionModal.errorMessage}
              onClose={() => setTransactionModal({ ...transactionModal, visible: false })}
              autoCloseDelay={3000}
            />
            <WalletConnectionModal
              visible={walletModalVisible}
              onClose={handleWalletModalClose}
              onConnect={handleWalletConnect}
            />
          </PageCard>
        </Space>
      </div>
    </AppLayout>
  );
}
