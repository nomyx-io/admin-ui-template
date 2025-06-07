import React, { useState, useContext } from "react";

import { Row, Col, Card, Typography, Button, Modal, Input } from "antd";
import { toast } from "react-toastify";

import NomyxLogo from "../assets/nomyx_logo_light.png";
import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import parseClient from "../services/ParseClient";
import { isEthereumAddress } from "../utils";

const { Paragraph } = Typography;

const Home = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [walletPreference, setWalletPreference] = useState(0);
  const [walletId, setWalletId] = useState("");
  const [personaReferenceId, setPersonaReferenceId] = useState("");
  const [loading, setLoading] = useState(false);

  const { user, dfnsToken } = useContext(RoleContext);

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
    if (!validateInputs()) {
      return;
    }

    if (!user?.walletId || !dfnsToken) {
      toast.error("User wallet or token not available");
      return;
    }

    setLoading(true);

    try {
      await toast.promise(
        (async () => {
          // Step 1: Create a User record for the new owner
          try {
            const { result: updateResult, error: updateError } = await parseClient.createOwnerRecord(
              newOwnerAddress.trim(),
              firstname.trim(),
              lastname.trim(),
              email.trim(),
              undefined, // password - not setting password here
              walletPreference,
              walletId.trim(),
              personaReferenceId.trim() || undefined
            );

            if (updateError) {
              console.warn("Failed to update new owner record:", updateError);
              toast.warn("Ownership transferred successfully, but failed to update user record");
            } else {
              console.log("New owner record updated successfully:", updateResult);
            }
          } catch (recordError) {
            console.warn("Error updating owner record:", recordError);
            toast.warn("Ownership transferred successfully, but record update failed");
          }

          // Step 2: Initiate transfer ownership
          const { initiateResponse, error: initError } = await DfnsService.initiateTransferOwnership(
            newOwnerAddress.trim(),
            user.walletId,
            dfnsToken
          );

          if (initError) throw new Error(`Failed to initiate transfer: ${initError}`);

          // Step 3: Complete transfer ownership
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
            render: ({ data }) => <div>{data?.message || "An error occurred during ownership transfer"}</div>,
          },
        }
      );

      // Reset form and close modal on success
      setNewOwnerAddress("");
      setFirstname("");
      setLastname("");
      setEmail("");
      setWalletPreference(0);
      setWalletId("");
      setPersonaReferenceId("");
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error during ownership transfer process:", error);
    } finally {
      setLoading(false);
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
                    className="bg-gray-100 text-gray-400 px-4 py-2 rounded-md hover:bg-gray-200 hover:text-gray-600 transition-colors opacity-30 hover:opacity-60 text-xs"
                    title="Emergency Transfer Ownership"
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
          <button key="cancel" onClick={handleCancel} className="bg-black text-white px-4 py-2 rounded-md mr-2 hover:bg-gray-800 transition-colors">
            Cancel
          </button>,
          <button
            key="confirm"
            onClick={handleTransferOwnership}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Confirm Transfer"}
          </button>,
        ]}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstname" className="block text-sm font-medium mb-2">
                First Name *
              </label>
              <Input
                id="firstname"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                placeholder="Enter first name"
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="lastname" className="block text-sm font-medium mb-2">
                Last Name *
              </label>
              <Input id="lastname" value={lastname} onChange={(e) => setLastname(e.target.value)} placeholder="Enter last name" className="w-full" />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email *
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="newOwnerAddress" className="block text-sm font-medium mb-2">
              New Owner Address *
            </label>
            <Input
              id="newOwnerAddress"
              value={newOwnerAddress}
              onChange={(e) => setNewOwnerAddress(e.target.value)}
              placeholder="Enter new owner Ethereum address"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="walletPreference" className="block text-sm font-medium mb-2">
                Wallet Preference *
              </label>
              <select
                id="walletPreference"
                value={walletPreference}
                onChange={(e) => setWalletPreference(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Managed (0)</option>
                <option value={1}>Private (1)</option>
              </select>
            </div>
            <div>
              <label htmlFor="walletId" className="block text-sm font-medium mb-2">
                Wallet ID *
              </label>
              <Input id="walletId" value={walletId} onChange={(e) => setWalletId(e.target.value)} placeholder="Enter wallet ID" className="w-full" />
            </div>
          </div>

          <div>
            <label htmlFor="personaReferenceId" className="block text-sm font-medium mb-2">
              Persona Reference ID
            </label>
            <Input
              id="personaReferenceId"
              value={personaReferenceId}
              onChange={(e) => setPersonaReferenceId(e.target.value)}
              placeholder="Enter persona reference ID (optional)"
              className="w-full"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This action will permanently transfer ownership of the contract to the specified address. This action cannot
              be undone. Please ensure all information is correct.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Home;
