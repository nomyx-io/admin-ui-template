import React, { useState, useContext, useEffect } from "react";

import { Row, Col, Card, Typography, Modal, Input, AutoComplete } from "antd";
import { toast } from "react-toastify";

import NomyxLogo from "../assets/nomyx_logo_light.png";
import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import parseClient from "../services/ParseClient";
import { isEthereumAddress } from "../utils";

const { Paragraph } = Typography;

const Home = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [walletPreference, setWalletPreference] = useState(0);
  const [walletId, setWalletId] = useState("");
  const [personaReferenceId, setPersonaReferenceId] = useState("");
  const [loading, setLoading] = useState(false);

  const { user, dfnsToken } = useContext(RoleContext);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await parseClient.getRegisteredUsers();
        setRegisteredUsers(users);
      } catch (error) {
        console.error("Failed to fetch registered users:", error);
      }
    };
    fetchUsers();
  }, []);

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
    if (!emailRegex.test(email)) {
      toast.error("Invalid email format");
      return false;
    }

    if (!walletId.trim()) {
      toast.error("Wallet ID is required");
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

    setLoading(true);

    try {
      await toast.promise(
        (async () => {
          try {
            const { result: updateResult, error: updateError } = await parseClient.createOwnerRecord(
              newOwnerAddress.trim(),
              firstname.trim(),
              lastname.trim(),
              email.trim(),
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
      setLoading(false);
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
    <div className="container">
      <header className="table-header" style={{ position: "relative" }}>
        <h1>Welcome to NomyxID</h1>
        <h2>Decentralized Identity Management</h2>
        <img src={NomyxLogo} alt="Nomyx Logo" style={{ position: "absolute", top: "-2rem", right: 10, width: "15%" }} />
      </header>
      <Row justify="center" gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Row justify="center" align="middle">
              <Col span={24}>
                <Paragraph>
                  To create a compliance rule, navigate to the "Compliance Rules" section in the Nomyx dashboard. Here, you can define a new rule by
                  providing a unique identifier and a descriptive name. This process ensures that each compliance rule is distinct and easily
                  recognizable. Once created, these compliance rules can be used to tag and organize various rules associated with an identity,
                  providing a structured and clear representation of the identity's attributes.
                </Paragraph>
                <Paragraph>
                  In the "Identities" section, you can create new identities by generating a DID and associating it with relevant compliance rules.
                  You can also update existing identities, adding or modifying rules to reflect changes in attributes or status. This flexible and
                  decentralized method of managing identities allows for a robust and scalable system that can adapt to various use cases, from
                  personal identity management to organizational credentialing.
                </Paragraph>
                <Paragraph>
                  The minted token can then be transferred or sold, carrying with it the embedded rules that can be verified independently. This
                  approach leverages the power of blockchain technology to provide immutable and transparent records, enhancing trust and authenticity
                  in digital transactions.
                </Paragraph>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={showModal}
                    className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-400 hover:text-gray-600 transition-colors hover:opacity-40 text-xs"
                  >
                    Transfer Ownership
                  </button>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Transfer Ownership"
        open={isModalVisible}
        onCancel={handleCancel}
        width={600}
        footer={[
          <button key="cancel" onClick={handleCancel} className="bg-black text-white px-4 py-2 rounded-md mr-2">
            Cancel
          </button>,
          <button
            key="confirm"
            onClick={handleTransferOwnership}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Confirm Transfer"}
          </button>,
        ]}
        maskClosable={false}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name *</label>
              <Input value={firstname} onChange={(e) => setFirstname(e.target.value)} disabled={!!selectedUser} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name *</label>
              <Input value={lastname} onChange={(e) => setLastname(e.target.value)} disabled={!!selectedUser} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <AutoComplete
              value={email}
              onChange={onEmailChange}
              options={registeredUsers?.map((u) => ({ value: u.email }))}
              placeholder="Enter email"
              className="w-full"
              filterOption={(inputValue, option) => option?.value.toLowerCase().includes(inputValue.toLowerCase())}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">New Owner Address *</label>
            <Input value={newOwnerAddress} onChange={(e) => setNewOwnerAddress(e.target.value)} disabled={!!selectedUser} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Wallet Preference *</label>
              <select
                value={walletPreference}
                onChange={(e) => setWalletPreference(Number(e.target.value))}
                disabled={!!selectedUser}
                className="w-full border"
              >
                <option value={0}>Managed (0)</option>
                <option value={1}>Private (1)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Wallet ID *</label>
              <Input value={walletId} onChange={(e) => setWalletId(e.target.value)} disabled={!!selectedUser} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Persona Reference ID</label>
            <Input value={personaReferenceId} onChange={(e) => setPersonaReferenceId(e.target.value)} disabled={!!selectedUser} />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
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
