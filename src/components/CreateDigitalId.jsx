import { useState, useContext, useEffect } from "react";

import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, Input, Select, Modal, message } from "antd";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import UserService from "../services/UserService";
import { isEthereumAddress } from "../utils";
import { awaitTimeout } from "../utils";
import { WalletPreference } from "../utils/Constants";

function CreateDigitalId({ service }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const navigate = useNavigate();

  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  const [displayName, setDisplayName] = useState(searchParams.get("displayName") || "");
  const [walletAddress, setWalletAddress] = useState(searchParams.get("walletAddress") || "");
  const [accountNumber, setAccountNumber] = useState(searchParams.get("accountNumber") || "");
  const [isProcessing, setIsProcessing] = useState(false);

  // Secondary Wallets State
  const [secondaryWallets, setSecondaryWallets] = useState([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [refreshingWallet, setRefreshingWallet] = useState(false);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [walletForm, setWalletForm] = useState({
    walletAddress: "",
  });
  const userEmail = searchParams.get("email") || null;

  // Check for incomplete operations on mount
  useEffect(() => {
    checkForIncompleteOperation();
  }, []);

  useEffect(() => {
    if (userEmail) {
      fetchUserWallets();
    }
  }, [userEmail]);

  const fetchUserWallets = async () => {
    if (!userEmail) return;

    setLoadingWallets(true);
    try {
      const wallets = await UserService.getUserWallets(userEmail);
      setSecondaryWallets(wallets || []);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      // Don't show error message on initial load, wallets might not exist yet
    } finally {
      setLoadingWallets(false);
    }
  };

  const handleRefreshWallet = async () => {
    if (!userEmail) {
      message.warning("User email not available. Please save the identity first.");
      return;
    }

    setRefreshingWallet(true);
    try {
      const result = await UserService.fetchAndStoreSecondaryWallet(userEmail);

      if (result.noDataFound) {
        message.warning("Secondary wallet record does not exist. Please contact T7X support.");
        // Show instruction to create manually
        Modal.info({
          title: "No Wallet Found",
          content: (
            <div>
              <p>No secondary wallet was found in the system for this user.</p>
              <p className="mt-2">You can manually create secondary wallet information using the "Add Wallet" button below.</p>
            </div>
          ),
        });
      } else if (result.success) {
        message.success(result.message);
        await fetchUserWallets();
      }
    } catch (error) {
      console.error("Error refreshing wallet:", error);
      message.error("Failed to refresh wallet. Please try again.");
    } finally {
      setRefreshingWallet(false);
    }
  };

  function validateDigitalID(displayName, walletAddress, accountNumber) {
    if (displayName.trim() === "") {
      toast.error("Identity display Name is required");
      return false;
    }

    if (walletAddress?.trim() === "") {
      toast.error("Investor Wallet Address is required");
      return false;
    }

    if (!isEthereumAddress(walletAddress)) {
      toast.error("Invalid Ethereum Wallet Address in Investor Wallet Address");
      return false;
    }

    if (accountNumber?.trim() === "") {
      toast.error("Investor KYC ID is required");
      return false;
    }

    return true;
  }

  // Secondary Wallet Management Functions
  const handleAddWallet = () => {
    setEditingWallet(null);
    setWalletForm({
      walletAddress: "",
    });
    setIsWalletModalVisible(true);
  };

  const handleEditWallet = (wallet) => {
    setEditingWallet(wallet);
    setWalletForm({
      walletAddress: wallet.walletAddress,
    });
    setIsWalletModalVisible(true);
  };

  const handleDeleteWallet = async (wallet) => {
    Modal.confirm({
      title: "Unlink Wallet",
      content: "Are you sure you want to unlink this wallet?",
      okText: "Unlink",
      okType: "danger",
      onOk: async () => {
        try {
          if (!wallet.id) {
            setSecondaryWallets(secondaryWallets.filter((w) => w.walletAddress !== wallet.walletAddress));
            message.success("Wallet removed");
            return;
          }

          setIsProcessing(true);
          const identityAddress = await UserService.getIdentityByEmail(userEmail);

          const { initiateResponse, error: initError } = await DfnsService.initiateUnlinkWallet(
            identityAddress,
            wallet.walletAddress,
            user.walletId,
            dfnsToken
          );

          if (initError) throw new Error(initError);

          const { completeResponse, error: completeError } = await DfnsService.completeUnlinkWallet(
            user.walletId,
            dfnsToken,
            initiateResponse.challenge,
            initiateResponse.requestBody
          );

          if (completeError) throw new Error(completeError);

          message.success("Wallet unlinked successfully");
          await fetchUserWallets();
        } catch (error) {
          console.error("Error unlinking wallet:", error);
          message.error("Failed to unlink wallet");
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleSaveWallet = async () => {
    if (!walletForm.walletAddress) {
      message.error("Wallet Address is required");
      return;
    }

    if (!isEthereumAddress(walletForm.walletAddress)) {
      message.error("Invalid Ethereum Wallet Address");
      return;
    }

    const isDuplicate = secondaryWallets.some((wallet) => {
      if (editingWallet && wallet.walletAddress === editingWallet.walletAddress) {
        return false;
      }
      return wallet.walletAddress.toLowerCase() === walletForm.walletAddress.toLowerCase();
    });

    if (isDuplicate) {
      message.error("This wallet address already exists");
      return;
    }

    try {
      if (editingWallet) {
        const updatedWallets = secondaryWallets.map((w) => (w === editingWallet ? { ...walletForm } : w));
        setSecondaryWallets(updatedWallets);
        message.success("Wallet updated locally");
      } else {
        setSecondaryWallets([...secondaryWallets, { ...walletForm }]);
        message.success("Wallet added locally");
      }

      setIsWalletModalVisible(false);
      setEditingWallet(null);
    } catch (error) {
      console.error("Error saving wallet:", error);
      message.error("Failed to save wallet");
    }
  };

  // Helper: Classify errors for better handling
  function classifyError(error) {
    const errorMsg = error.message || error.reason || "";

    if (errorMsg.includes("nonce") || error.code === "NONCE_EXPIRED") {
      return { type: "NONCE_ERROR", retryable: true, userMessage: "Blockchain sync issue. Please try again after some time." };
    }
    if (errorMsg.includes("gas")) {
      return { type: "GAS_ERROR", retryable: false, userMessage: "Insufficient gas" };
    }
    if (errorMsg.includes("already exists") || errorMsg.includes("duplicate")) {
      return { type: "DUPLICATE", retryable: false, userMessage: "Identity already exists" };
    }
    if (error.code === 4001 || errorMsg.includes("cancel")) {
      return { type: "USER_CANCELLED", retryable: false, userMessage: "Operation cancelled" };
    }
    if (errorMsg.includes("reject")) {
      return { type: "USER_REJECTED", retryable: false, userMessage: "Operation rejected" };
    }

    return { type: "UNKNOWN", retryable: false, userMessage: errorMsg };
  }

  // Helper: Retry with exponential backoff
  async function retryWithBackoff(operation, maxRetries = 3, operationName = "operation") {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        const errorInfo = classifyError(error);

        if (!errorInfo.retryable || i === maxRetries - 1) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        console.log(`${operationName} failed (attempt ${i + 1}/${maxRetries}), retrying in ${delay}ms...`, error);
        await awaitTimeout(delay);
      }
    }
  }
  // Helper: Poll for blockchain verification until true
  async function waitForVerification(service, walletAddress, maxAttempts = 12, delayMs = 5000) {
    for (let i = 0; i < maxAttempts; i++) {
      const isRegistered = await service.isVerified(walletAddress);
      console.log(`Verification check (${i + 1}/${maxAttempts}):`, isRegistered);

      if (isRegistered) return true;

      // Wait before next attempt
      await awaitTimeout(delayMs);
    }

    return false; // After all attempts, still not verified
  }

  // Helper: Save operation state
  function saveOperationState(walletAddr, state) {
    const stateKey = `identity-creation-${walletAddr.toLowerCase()}`;
    try {
      localStorage.setItem(
        stateKey,
        JSON.stringify({
          ...state,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.error("Failed to save state:", e);
    }
  }

  // Helper: Load operation state
  function loadOperationState(walletAddr) {
    const stateKey = `identity-creation-${walletAddr.toLowerCase()}`;
    try {
      const saved = localStorage.getItem(stateKey);
      if (!saved) return null;

      const state = JSON.parse(saved);
      if (Date.now() - state.timestamp > 3600000) {
        localStorage.removeItem(stateKey);
        return null;
      }

      return state;
    } catch (e) {
      console.error("Failed to load state:", e);
      return null;
    }
  }

  // Helper: Clear operation state
  function clearOperationState(walletAddr) {
    const stateKey = `identity-creation-${walletAddr.toLowerCase()}`;
    try {
      localStorage.removeItem(stateKey);
    } catch (e) {
      console.error("Failed to clear state:", e);
    }
  }

  // Check for incomplete operations on mount
  async function checkForIncompleteOperation() {
    if (!walletAddress) return;

    const savedState = loadOperationState(walletAddress);
    if (savedState && !savedState.completed) {
      const shouldResume = window.confirm("An incomplete identity creation was detected. Would you like to resume?");

      if (shouldResume) {
        setDisplayName(savedState.displayName || displayName);
        setAccountNumber(savedState.accountNumber || accountNumber);
        toast.info('Ready to resume identity creation. Click "Create Digital Id" to continue.');
      } else {
        clearOperationState(walletAddress);
      }
    }
  }

  // Save secondary wallets to database after identity creation
  const saveSecondaryWallets = async (email) => {
    if (secondaryWallets.length === 0) return;

    const toastId = toast.loading("Saving secondary wallets...");

    try {
      for (const wallet of secondaryWallets) {
        await UserService.saveUserWallet(email, wallet);
      }

      toast.update(toastId, {
        render: `${secondaryWallets.length} secondary wallet(s) saved successfully`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Error saving secondary wallets:", error);
      toast.update(toastId, {
        render: "Warning: Some secondary wallets may not have been saved",
        type: "warning",
        isLoading: false,
        autoClose: 5000,
      });
    }
  };

  const handleCreateDigitalId = async () => {
    const trimmedDisplayName = displayName.trim();
    const trimmedAccountNumber = accountNumber.trim();

    if (!validateDigitalID(trimmedDisplayName, walletAddress, trimmedAccountNumber)) {
      return;
    }

    if (isProcessing) {
      toast.warning("Operation already in progress");
      return;
    }

    setIsProcessing(true);

    try {
      if (walletPreference === WalletPreference.MANAGED) {
        await processManagedWallet(trimmedDisplayName, trimmedAccountNumber);
      } else if (walletPreference === WalletPreference.PRIVATE) {
        await processPrivateWallet(trimmedDisplayName, trimmedAccountNumber);
      }
    } catch (error) {
      const errorInfo = classifyError(error);
      if (errorInfo.type !== "USER_CANCELLED" && errorInfo.type !== "USER_REJECTED") {
        console.error("Unexpected error in digital ID flow:", error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const processManagedWallet = async (trimmedDisplayName, trimmedAccountNumber) => {
    let toastId = null;
    const walletAddr = walletAddress.toLowerCase();

    try {
      toastId = toast.loading("Processing Digital Identity...");

      const savedState = loadOperationState(walletAddr);
      let identityCreatedOrExists = savedState?.identityCreated || false;
      let identityRegisteredOrExists = savedState?.identityRegistered || false;
      let identity = savedState?.identity || null;

      saveOperationState(walletAddr, {
        displayName: trimmedDisplayName,
        accountNumber: trimmedAccountNumber,
        identityCreated: identityCreatedOrExists,
        identityRegistered: identityRegisteredOrExists,
        identity,
        completed: false,
      });

      // Step 1: Check if identity already exists
      if (!identity || identity === "0x0000000000000000000000000000000000000000") {
        try {
          identity = await retryWithBackoff(async () => await UserService.getIdentityByEmail(userEmail), 8, "Get existing identity");
          console.log("Existing identity check:", identity);

          if (identity) {
            identityCreatedOrExists = true;
            saveOperationState(walletAddr, {
              displayName: trimmedDisplayName,
              accountNumber: trimmedAccountNumber,
              identityCreated: true,
              identityRegistered: identityRegisteredOrExists,
              identity,
              completed: false,
            });
          }
        } catch (error) {
          console.log("No existing identity found, will create new one");
        }
      }

      // Step 2: Create identity only if it doesn't exist
      if (!identityCreatedOrExists) {
        console.log("Creating new identity...");
        toast.update(toastId, { render: "Creating identity..." });
        // This creates an array of lowercased wallet addresses (strings)
        // .map() on an array returns an array, so .toArray() is unnecessary and would cause an error.
        // Use just .map(...), which is correct for building a string array in JS.
        const secondaryWalletAddresses = secondaryWallets.map((wallet) => wallet.walletAddress.toLowerCase());
        const createIdentity = async () => {
          const { initiateResponse, error: initError } = await DfnsService.initiateCreateIdentity(
            walletAddress,
            user.walletId,
            dfnsToken,
            secondaryWalletAddresses
          );

          if (initError) {
            const errorInfo = classifyError({ message: initError });
            if (errorInfo.type === "USER_CANCELLED") {
              toast.update(toastId, {
                render: "Identity creation cancelled",
                type: "warning",
                isLoading: false,
                autoClose: 3000,
              });
              throw new Error("USER_CANCELLED");
            } else if (errorInfo.type === "USER_REJECTED") {
              toast.update(toastId, {
                render: "Identity creation rejected",
                type: "error",
                isLoading: false,
                autoClose: 3000,
              });
              throw new Error("USER_REJECTED");
            }
            throw new Error(initError);
          }

          const { completeResponse, error: completeError } = await DfnsService.completeCreateIdentity(
            user.walletId,
            dfnsToken,
            initiateResponse.challenge,
            initiateResponse.requestBody
          );

          if (completeError) {
            const errorInfo = classifyError({ message: completeError });
            if (errorInfo.type === "USER_CANCELLED") {
              toast.update(toastId, {
                render: "Identity creation cancelled",
                type: "warning",
                isLoading: false,
                autoClose: 3000,
              });
              throw new Error("USER_CANCELLED");
            } else if (errorInfo.type === "USER_REJECTED") {
              toast.update(toastId, {
                render: "Identity creation rejected",
                type: "error",
                isLoading: false,
                autoClose: 3000,
              });
              throw new Error("USER_REJECTED");
            }
            throw new Error(completeError);
          }
          return completeResponse;
        };

        await createIdentity();
        await awaitTimeout(5000);
        identity = await retryWithBackoff(
          async () => {
            const result = await UserService.getIdentityByEmail(userEmail);
            if (!result?.address) {
              throw new Error("Identity not yet propagated"); // force retry
            }
            return result;
          },
          8,
          "Get created identity"
        );
        console.log("New identity created:", identity.address);
        identityCreatedOrExists = true;

        saveOperationState(walletAddr, {
          displayName: trimmedDisplayName,
          accountNumber: trimmedAccountNumber,
          identityCreated: true,
          identityRegistered: identityRegisteredOrExists,
          identity,
          completed: false,
        });
      } else {
        console.log("Identity already exists:", identity);
        toast.update(toastId, { render: "Identity found, proceeding..." });
      }

      // Step 3 & 4: Register identity
      if (!identityRegisteredOrExists) {
        // let needsRegistration = true;
        // try {
        //   const isRegistered = await retryWithBackoff(async () => await service.isVerified(walletAddress), 8, "Check registration");

        //   if (isRegistered) {
        //     console.log("Identity already registered in Blockchain");
        //     needsRegistration = false;
        //     identityRegisteredOrExists = true;
        //     toast.update(toastId, { render: "Identity already registered, updating metadata..." });

        //     saveOperationState(walletAddr, {
        //       displayName: trimmedDisplayName,
        //       accountNumber: trimmedAccountNumber,
        //       identityCreated: identityCreatedOrExists,
        //       identityRegistered: true,
        //       identity,
        //       completed: false,
        //     });
        //   }
        // } catch (error) {
        //   console.log("Error checking registration, will attempt registration:", error);
        // }

        // Step 4: Register identity in Blockchain only if needed
        //if (needsRegistration) {
        console.log("Registering identity in Blockchain...");
        toast.update(toastId, { render: "Registering identity on blockchain..." });

        const registerIdentity = async () => {
          const { addIdentityInitResponse, error: addIdentityInitError } = await DfnsService.initiateAddIdentity(
            walletAddress,
            identity,
            user.walletId,
            dfnsToken
          );

          if (addIdentityInitError) {
            const errorInfo = classifyError({ message: addIdentityInitError });
            if (errorInfo.type === "USER_CANCELLED") {
              toast.update(toastId, {
                render: "Identity registration cancelled",
                type: "warning",
                isLoading: false,
                autoClose: 3000,
              });
              throw new Error("USER_CANCELLED");
            } else if (errorInfo.type === "USER_REJECTED") {
              toast.update(toastId, {
                render: "Identity registration rejected",
                type: "error",
                isLoading: false,
                autoClose: 3000,
              });
              throw new Error("USER_REJECTED");
            }
            throw new Error(addIdentityInitError);
          }

          const { addIdentityCompleteResponse, error: addIdentityCompleteError } = await DfnsService.completeAddIdentity(
            user.walletId,
            dfnsToken,
            addIdentityInitResponse.challenge,
            addIdentityInitResponse.requestBody
          );

          if (addIdentityCompleteError) {
            const errorInfo = classifyError({ message: addIdentityCompleteError });
            if (errorInfo.type === "USER_CANCELLED") {
              toast.update(toastId, {
                render: "Identity registration cancelled",
                type: "warning",
                isLoading: false,
                autoClose: 3000,
              });
              throw new Error("USER_CANCELLED");
            } else if (errorInfo.type === "USER_REJECTED") {
              toast.update(toastId, {
                render: "Identity registration rejected",
                type: "error",
                isLoading: false,
                autoClose: 3000,
              });
              throw new Error("USER_REJECTED");
            }
            throw new Error(addIdentityCompleteError);
          }

          return addIdentityCompleteResponse;
        };

        const registrationResponse = await retryWithBackoff(registerIdentity, 8, "Register identity");

        if (registrationResponse?.transactionHash) {
          toast.update(toastId, { render: "Waiting for blockchain confirmation..." });
        } else {
          await awaitTimeout(3000);
        }

        // Verify registration succeeded
        // const isNowRegistered = await waitForVerification(service, walletAddress, 12, 5000);
        // console.log("Final verification status:", isNowRegistered);

        // if (!isNowRegistered) {
        //   throw new Error("Registration verification failed - identity not found on blockchain after waiting");
        // }

        console.log("Identity registered in Blockchain successfully");
        identityRegisteredOrExists = true;

        saveOperationState(walletAddr, {
          displayName: trimmedDisplayName,
          accountNumber: trimmedAccountNumber,
          identityCreated: identityCreatedOrExists,
          identityRegistered: true,
          identity,
          completed: false,
        });
      }

      saveOperationState(walletAddr, {
        displayName: trimmedDisplayName,
        accountNumber: trimmedAccountNumber,
        identityCreated: true,
        identityRegistered: true,
        identity,
        completed: true,
      });

      if (secondaryWallets.length > 0 && userEmail) {
        await saveSecondaryWallets(userEmail);
      }

      toast.update(toastId, {
        render: "Digital Identity processed successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      clearOperationState(walletAddr);
      navigate("/identities");
    } catch (error) {
      const errorInfo = classifyError(error);

      if (errorInfo.type === "USER_CANCELLED" || errorInfo.type === "USER_REJECTED") {
        return;
      }

      console.error("Error in managed wallet flow:", error);

      if (toastId) {
        let errorMessage = error?.reason || error?.message || "An error occurred while processing Digital Identity";

        if (errorInfo.type === "NONCE_ERROR") {
          errorMessage = "Blockchain sync issue detected. Please try again in a moment.";
        }

        toast.update(toastId, {
          render: errorMessage,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        toast.error(error?.reason || error?.message || "An error occurred while processing Digital Identity");
      }

      throw error;
    }
  };

  const processPrivateWallet = async (trimmedDisplayName, trimmedAccountNumber) => {
    let toastId = null;
    const walletAddr = walletAddress.toLowerCase();

    try {
      toastId = toast.loading("Processing Digital Identity...");

      const savedState = loadOperationState(walletAddr);
      let identityCreatedOrExists = savedState?.identityCreated || false;
      let identityRegisteredOrExists = savedState?.identityRegistered || false;
      let identity = savedState?.identity || null;

      saveOperationState(walletAddr, {
        displayName: trimmedDisplayName,
        accountNumber: trimmedAccountNumber,
        identityCreated: identityCreatedOrExists,
        identityRegistered: identityRegisteredOrExists,
        identity,
        completed: false,
      });

      // Step 1: Check if identity already exists
      if (!identity || identity === "0x0000000000000000000000000000000000000000") {
        try {
          identity = await retryWithBackoff(async () => await UserService.getIdentityByEmail(userEmail), 8, "Get existing identity");
          console.log("Existing identity check:", identity);

          if (identity) {
            identityCreatedOrExists = true;
            saveOperationState(walletAddr, {
              displayName: trimmedDisplayName,
              accountNumber: trimmedAccountNumber,
              identityCreated: true,
              identityRegistered: identityRegisteredOrExists,
              identity,
              completed: false,
            });
          }
        } catch (error) {
          console.log("No existing identity found, will create new one");
        }
      }

      // Step 2: Create identity only if it doesn't exist
      if (!identityCreatedOrExists) {
        console.log("Creating new identity...");
        toast.update(toastId, { render: "Creating identity..." });

        try {
          await service.createIdentity(walletAddress);
          await awaitTimeout(2000);

          identity = await retryWithBackoff(async () => await UserService.getIdentityByEmail(userEmail), 8, "Get existing identity");

          console.log("New identity created:", identity);
          identityCreatedOrExists = true;

          saveOperationState(walletAddr, {
            displayName: trimmedDisplayName,
            accountNumber: trimmedAccountNumber,
            identityCreated: true,
            identityRegistered: identityRegisteredOrExists,
            identity,
            completed: false,
          });
        } catch (error) {
          const errorInfo = classifyError(error);
          if (errorInfo.type === "USER_CANCELLED") {
            toast.update(toastId, {
              render: "Identity creation cancelled",
              type: "warning",
              isLoading: false,
              autoClose: 3000,
            });
            throw new Error("USER_CANCELLED");
          } else if (errorInfo.type === "USER_REJECTED") {
            toast.update(toastId, {
              render: "Identity creation rejected",
              type: "error",
              isLoading: false,
              autoClose: 3000,
            });
            throw new Error("USER_REJECTED");
          }
          throw error;
        }
      } else {
        console.log("Identity already exists:", identity);
        toast.update(toastId, { render: "Identity found, proceeding..." });
      }

      // Step 3 & 4: Register identity
      if (!identityRegisteredOrExists) {
        console.log("Registering identity in Blockchain...");
        toast.update(toastId, { render: "Registering identity in Blockchain..." });

        try {
          const tx = await service.addIdentity(walletAddress, identity);

          if (tx?.hash) {
            toast.update(toastId, { render: "Waiting for blockchain confirmation..." });
          } else {
            await awaitTimeout(3000);
          }

          console.log("Identity registered in Blockchain successfully");
          identityRegisteredOrExists = true;

          saveOperationState(walletAddr, {
            displayName: trimmedDisplayName,
            accountNumber: trimmedAccountNumber,
            identityCreated: identityCreatedOrExists,
            identityRegistered: true,
            identity,
            completed: false,
          });
        } catch (error) {
          const errorInfo = classifyError(error);
          if (errorInfo.type === "USER_CANCELLED") {
            toast.update(toastId, {
              render: "Identity registration cancelled",
              type: "warning",
              isLoading: false,
              autoClose: 3000,
            });
            throw new Error("USER_CANCELLED");
          } else if (errorInfo.type === "USER_REJECTED") {
            toast.update(toastId, {
              render: "Identity registration rejected",
              type: "error",
              isLoading: false,
              autoClose: 3000,
            });
            throw new Error("USER_REJECTED");
          }
          throw error;
        }
      }
      // Mark as completed and clear saved state
      saveOperationState(walletAddr, {
        displayName: trimmedDisplayName,
        accountNumber: trimmedAccountNumber,
        identityCreated: true,
        identityRegistered: true,
        identity,
        completed: true,
      });

      // Save secondary wallets if any
      if (secondaryWallets.length > 0) {
        toast.info("Note: Secondary wallets will be saved after user approval");
      }

      toast.update(toastId, {
        render: "Digital Identity processed successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      clearOperationState(walletAddr);
      navigate("/identities");
    } catch (error) {
      const errorInfo = classifyError(error);

      if (errorInfo.type === "USER_CANCELLED" || errorInfo.type === "USER_REJECTED") {
        return;
      }

      console.error("Error in private wallet flow:", error);

      if (toastId) {
        let errorMessage = error?.reason || error?.message || "An error occurred while processing Digital Identity";

        if (errorInfo.type === "NONCE_ERROR") {
          errorMessage = "Blockchain sync issue detected. Please try again in a moment.";
        }

        toast.update(toastId, {
          render: errorMessage,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        toast.error(error?.reason || error?.message || "An error occurred while processing Digital Identity");
      }

      throw error;
    }
  };

  return (
    <div>
      <Breadcrumb
        className="bg-transparent"
        items={[
          {
            title: <Link to={"/"}>Home</Link>,
          },
          {
            title: <Link to={"/identities"}>Identities</Link>,
          },
          {
            title: "Add",
          },
        ]}
      />
      <p className="text-xl p-6">Create Digital Id</p>
      <hr></hr>
      <div className="p-6 mt-2">
        <div>
          <label htmlFor="identityName">Identity display name *</label>
          <div className="mt-3 relative w-full flex border rounded-lg">
            <Input
              id="identityName"
              value={displayName}
              className="border w-full p-2 rounded-lg text-xl"
              placeholder="Enter Display Name"
              type="text"
              maxLength={32}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isProcessing}
            />
            <p className="absolute right-5 top-3">{displayName.length}/32</p>
          </div>
          <p>User-friendly name that describes the trusted issuers. Shown to end-users</p>
        </div>
        <div className="mt-10 mb-6 w-[100%] max-[600px]:w-full border p-6 rounded-lg">
          <div>
            <label htmlFor="investorWalletAddress">Investor Wallet Address</label>
            <div className="mt-2 relative w-full flex border rounded-lg">
              <Input
                id="walletAddress"
                value={walletAddress}
                className="border w-full p-2 rounded-lg text-3xl"
                placeholder="Enter Wallet Address"
                type="text"
                onChange={(e) => setWalletAddress(e.target.value.trim())}
                disabled={isProcessing}
              />
            </div>
          </div>
          <div className="mt-6">
            <label htmlFor="investorAccountNumber">Investor KYC ID Provider Account Number</label>
            <div className="mt-2 relative w-full flex border rounded-lg">
              <Input
                id="investorAccountNumber"
                value={accountNumber}
                className="border w-full p-2 rounded-lg text-3xl"
                placeholder="Enter Account number"
                type="text"
                onChange={(e) => setAccountNumber(e.target.value)}
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        {/* Secondary Wallets Section */}
        <div className="mt-6 mb-6 w-[100%] max-[600px]:w-full border p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-lg font-semibold">Secondary Wallets (Optional)</p>
              <p className="text-sm text-gray-500">
                {userEmail ? "Manage additional wallets for this identity" : "Add wallets locally. They will be saved after identity creation."}
              </p>
            </div>
            <div className="flex gap-2">
              {userEmail && secondaryWallets.length === 0 && !loadingWallets && (
                <Button type="default" icon={<ReloadOutlined />} loading={refreshingWallet} onClick={handleRefreshWallet} disabled={isProcessing}>
                  Refresh from API
                </Button>
              )}
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddWallet} className="bg-[#9952b3]" disabled={isProcessing}>
                Add Wallet
              </Button>
            </div>
          </div>

          {loadingWallets ? (
            <div className="text-center py-8">Loading wallets...</div>
          ) : secondaryWallets.length === 0 ? (
            <div className="border rounded-xl p-6 bg-gray-50 text-center">
              <p className="text-gray-500 mb-2">No secondary wallets found</p>
              <p className="text-sm text-gray-400">
                {userEmail
                  ? "Click 'Refresh from API' to fetch from the system or 'Add Wallet' to create manually"
                  : "Click 'Add Wallet' to add secondary wallets for this identity"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {secondaryWallets.map((wallet, index) => (
                <div key={wallet.walletAddress || index} className="border rounded-xl p-4 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">Wallet Address:</span>
                        <span className="text-gray-600 font-mono text-sm">{wallet.walletAddress}</span>
                        {!wallet.walletAddress && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Not saved yet</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="text" icon={<EditOutlined />} onClick={() => handleEditWallet(wallet)} disabled={isProcessing} />
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteWallet(wallet)} disabled={isProcessing} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end max-[600px]:justify-center">
          <Button
            onClick={handleCreateDigitalId}
            className="nomyx-id-button max-[600px]:w-[60%] min-w-max text-center font-semibold h-11"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Create Digital Id"}
          </Button>
        </div>
      </div>

      {/* Wallet Modal */}
      <Modal
        title={editingWallet ? "Edit Secondary Wallet" : "Add Secondary Wallet"}
        open={isWalletModalVisible}
        onOk={handleSaveWallet}
        onCancel={() => {
          setIsWalletModalVisible(false);
          setEditingWallet(null);
        }}
        okText={editingWallet ? "Update" : "Add"}
        okButtonProps={{ className: "bg-[#9952b3]" }}
      >
        <div className="flex flex-col gap-4 mt-4">
          <div>
            <label htmlFor="modalWalletAddress" className="block mb-2">
              Wallet Address <span className="text-red-500">*</span>
            </label>
            <Input
              id="modalWalletAddress"
              value={walletForm.walletAddress}
              onChange={(e) => setWalletForm({ ...walletForm, walletAddress: e.target.value })}
              placeholder="Enter wallet address (0x...)"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CreateDigitalId;
