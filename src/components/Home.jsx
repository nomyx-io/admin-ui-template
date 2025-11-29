import React, { useState, useContext, useEffect } from "react";

import { Modal, Input, AutoComplete, Typography } from "antd";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import parseClient from "../services/ParseClient";
import { isEthereumAddress } from "../utils";

const { Paragraph } = Typography;

const StatCard = ({ title, value, icon, loading, to }) => {
  const Content = () => (
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
        ) : (
          <h3 className="text-3xl font-bold text-[var(--text-primary)]">{value}</h3>
        )}
      </div>
      <div className="p-3 bg-slate-50 rounded-lg text-[var(--color-primary)]">{icon}</div>
    </div>
  );

  return to ? (
    <Link to={to} className="modern-card p-6 hover-lift cursor-pointer block">
      <Content />
    </Link>
  ) : (
    <div className="modern-card p-6 hover-lift cursor-default">
      <Content />
    </div>
  );
};

const Home = ({ service }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Stats State
  const [stats, setStats] = useState({
    users: 0,
    issuers: 0,
    topics: 0,
  });
  const [loading, setLoading] = useState(true);

  // Transfer Form State
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [walletPreference, setWalletPreference] = useState(0);
  const [walletId, setWalletId] = useState("");
  const [personaReferenceId, setPersonaReferenceId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  const { user, dfnsToken } = useContext(RoleContext);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Fetch Users
        const users = await parseClient.getRegisteredUsers();
        const filteredUsers = users.filter((user) => !!user.email);
        setRegisteredUsers(filteredUsers);

        // 2. Fetch Blockchain Stats if service is available
        let issuerCount = 0;
        let topicCount = 0;

        if (service) {
          try {
            const issuers = await service.getTrustedIssuers();
            if (issuers) issuerCount = issuers.length;

            const topics = await service.getClaimTopics();
            if (topics) topicCount = topics.length;
          } catch (err) {
            console.error("Error fetching blockchain stats:", err);
          }
        }

        setStats({
          users: filteredUsers.length,
          issuers: issuerCount,
          topics: topicCount,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [service]);

  // ... Existing Form Logic ...
  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setNewOwnerAddress("");
    setFirstname("");
    setLastname("");
    setEmail("");
    setWalletPreference(0);
    setWalletId("");
    setPersonaReferenceId("");
    setSelectedUser(null);
  };

  const validateInputs = () => {
    if (!newOwnerAddress.trim()) {
      toast.error("New owner address is required");
      return false;
    }

    if (!isEthereumAddress(newOwnerAddress)) {
      toast.error("Invalid Ethereum address for new owner");
      return false;
    }

    if (!firstname.trim()) {
      toast.error("First name is required");
      return false;
    }

    if (!lastname.trim()) {
      toast.error("Last name is required");
      return false;
    }

    if (!email.trim()) {
      toast.error("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!selectedUser && !emailRegex.test(email)) {
      toast.error("Invalid email format");
      return false;
    }
    return true;
  };

  const handleTransferOwnership = async () => {
    if (!validateInputs()) return;

    if (!user?.walletId || !dfnsToken) {
      toast.error("User wallet or token not available");
      return;
    }

    setTransferLoading(true);

    try {
      await toast.promise(
        (async () => {
          try {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const { result: updateResult, error: updateError } = await parseClient.createOwnerRecord(
              newOwnerAddress.trim(),
              firstname.trim(),
              lastname.trim(),
              emailRegex.test(email) ? email.trim() : "",
              undefined,
              walletPreference,
              walletId.trim(),
              personaReferenceId.trim() || undefined
            );

            if (updateError) {
              console.warn("Failed to update new owner record:", updateError);
              toast.warn("Ownership transferred, but failed to update user record");
            } else {
              console.log("New owner record updated:", updateResult);
            }
          } catch (recordError) {
            console.warn("Error updating owner record:", recordError);
            toast.warn("Ownership transferred, but record update failed");
          }

          const { initiateResponse, error: initError } = await DfnsService.initiateTransferOwnership(
            newOwnerAddress.trim(),
            user.walletId,
            dfnsToken
          );
          if (initError) throw new Error(`Failed to initiate transfer: ${initError}`);

          const { completeResponse, error: completeError } = await DfnsService.completeTransferOwnership(
            user.walletId,
            dfnsToken,
            initiateResponse.challenge,
            initiateResponse.requestBody
          );
          if (completeError) throw new Error(`Failed to complete transfer: ${completeError}`);

          return { completeResponse };
        })(),
        {
          pending: "Transferring ownership...",
          success: "Ownership transferred successfully",
          error: {
            render: ({ data }) => <div>{data?.message || "Error during ownership transfer"}</div>,
          },
        }
      );

      handleCancel();
    } catch (error) {
      console.error("Transfer error:", error);
    } finally {
      setTransferLoading(false);
    }
  };

  const onEmailChange = (value) => {
    setEmail(value);
    const matchedUser = registeredUsers?.find((u) => u.email === value);

    if (matchedUser) {
      setSelectedUser(matchedUser);
      setFirstname(matchedUser.firstName || "");
      setLastname(matchedUser.lastName || "");
      setNewOwnerAddress(matchedUser.walletAddress || "");
      setWalletPreference(matchedUser.walletPreference ?? 0);
      setWalletId(matchedUser.walletId || "");
      setPersonaReferenceId(matchedUser.personaReferenceId || "");
    } else {
      setSelectedUser(null);
      setFirstname("");
      setLastname("");
      setNewOwnerAddress("");
      setWalletPreference(0);
      setWalletId("");
      setPersonaReferenceId("");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome to NomyxID</h1>
          <p className="text-[var(--text-secondary)] mt-1">Decentralized Identity Management Dashboard</p>
        </div>
        <button
          onClick={showModal}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Transfer Ownership
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Registered Users"
          value={stats.users}
          loading={loading}
          // to="/users" // Assuming there is a users page, if not, leave it unlinked or link to relevant section
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
          }
        />
        <StatCard
          title="Trusted Issuers"
          value={stats.issuers}
          loading={loading}
          to="/issuers"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
              />
            </svg>
          }
        />
        <StatCard
          title="Compliance Topics"
          value={stats.topics}
          loading={loading}
          to="/topics"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          }
        />
      </div>

      {/* Introduction Section (Preserved Content) */}
      <div className="modern-card p-8 bg-white">
        <div className="prose max-w-none text-[var(--text-secondary)]">
          <Paragraph>
            To create a compliance rule, navigate to the "Compliance Rules" section in the Nomyx dashboard. Here, you can define a new rule by
            providing a unique identifier and a descriptive name. This process ensures that each compliance rule is distinct and easily recognizable.
            Once created, these compliance rules can be used to tag and organize various rules associated with an identity, providing a structured and
            clear representation of the identity's attributes.
          </Paragraph>
          <Paragraph>
            In the "Identities" section, you can create new identities by generating a DID and associating it with relevant compliance rules. You can
            also update existing identities, adding or modifying rules to reflect changes in attributes or status. This flexible and decentralized
            method of managing identities allows for a robust and scalable system that can adapt to various use cases, from personal identity
            management to organizational credentialing.
          </Paragraph>
          <Paragraph>
            The minted token can then be transferred or sold, carrying with it the embedded rules that can be verified independently. This approach
            leverages the power of blockchain technology to provide immutable and transparent records, enhancing trust and authenticity in digital
            transactions.
          </Paragraph>
        </div>
      </div>

      {/* Documentation/Quick Links */}
      <div className="modern-card p-6 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] text-white">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Ready to get started?</h3>
            <p className="text-blue-100 text-sm max-w-xl">
              Explore our documentation to learn more about how to manage Decentralized Identities (DIDs), Verifiable Credentials (VCs), and
              Compliance Rules on the blockchain.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <a href="/topics" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition-colors backdrop-blur-sm">
              Manage Rules
            </a>
            <a
              href="/issuers"
              className="px-4 py-2 bg-white text-[var(--color-primary)] hover:bg-gray-100 rounded-md text-sm font-medium transition-colors"
            >
              View Issuers
            </a>
          </div>
        </div>
      </div>

      {/* Transfer Ownership Modal */}
      <Modal
        title={<span className="text-lg font-semibold">Transfer Ownership</span>}
        open={isModalVisible}
        onCancel={handleCancel}
        width={600}
        footer={[
          <button key="cancel" onClick={handleCancel} className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 mr-2 font-medium">
            Cancel
          </button>,
          <button
            key="confirm"
            onClick={handleTransferOwnership}
            disabled={transferLoading}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {transferLoading ? "Processing..." : "Confirm Transfer"}
          </button>,
        ]}
        maskClosable={false}
        className="modern-modal"
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">First Name *</label>
              <Input value={firstname} onChange={(e) => setFirstname(e.target.value)} className="w-full input-glow" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Last Name *</label>
              <Input value={lastname} onChange={(e) => setLastname(e.target.value)} className="w-full input-glow" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Email *</label>
            <AutoComplete
              value={email}
              onChange={onEmailChange}
              options={registeredUsers?.map((u) => ({ value: u.email }))}
              placeholder="Enter email"
              className="w-full input-glow"
              filterOption={(inputValue, option) => option?.value.toLowerCase().includes(inputValue.toLowerCase())}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">New Owner Address *</label>
            <Input
              value={newOwnerAddress}
              onChange={(e) => setNewOwnerAddress(e.target.value)}
              disabled={!!selectedUser}
              className="w-full input-glow"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Wallet Preference *</label>
              <select
                value={walletPreference}
                onChange={(e) => setWalletPreference(Number(e.target.value))}
                disabled={!!selectedUser && !selectedUser.walletPreference}
                className="w-full border rounded-md p-2 border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none input-glow bg-white"
              >
                <option value={0}>Managed (0)</option>
                <option value={1}>Private (1)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Wallet ID</label>
              <Input
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                disabled={!!selectedUser && !!selectedUser.walletId}
                className="w-full input-glow"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Persona Reference ID</label>
            <Input
              value={personaReferenceId}
              onChange={(e) => setPersonaReferenceId(e.target.value)}
              disabled={!!selectedUser && !!selectedUser.personaReferenceId}
              className="w-full input-glow"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex gap-3 items-start">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5">
              <path
                fillRule="evenodd"
                d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This action will permanently transfer ownership. This cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Home;
