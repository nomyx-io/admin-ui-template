import { useState, useContext, useEffect } from "react";

import { Breadcrumb, Button, Input } from "antd";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
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

  // Check for incomplete operations on mount
  useEffect(() => {
    checkForIncompleteOperation();
  }, []);

  function validateDigitalID(displayName, walletAddress, accountNumber) {
    if (displayName.trim() === "") {
      toast.error("Identity display Name is required");
      return false;
    }

    //if (!isAlphanumericAndSpace(displayName)) {
    //    toast.error('Identity display Name must contain only alphanumeric characters');
    //    return false;
    //}

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

    //if (!isAlphanumericAndSpace(accountNumber)) {
    //    toast.error('Investor KYC ID must contain only alphanumeric characters');
    //    return false;
    //}

    return true;
  }

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

        // Don't retry user cancellations or non-retryable errors
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
      // Ignore states older than 1 hour
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
        // The user can click the button again to resume
        toast.info('Ready to resume identity creation. Click "Create Digital Id" to continue.');
      } else {
        clearOperationState(walletAddress);
      }
    }
  }

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

      // Load any saved state
      const savedState = loadOperationState(walletAddr);
      let identityCreatedOrExists = savedState?.identityCreated || false;
      let identityRegisteredOrExists = savedState?.identityRegistered || false;
      let identity = savedState?.identity || null;

      // Save initial state
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
          identity = await retryWithBackoff(async () => await DfnsService.getIdentity(walletAddress), 8, "Get identity");
          console.log("Existing identity check:", identity);

          if (identity && identity !== "0x0000000000000000000000000000000000000000") {
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

        const createIdentity = async () => {
          const { initiateResponse, error: initError } = await DfnsService.initiateCreateIdentity(walletAddress, user.walletId, dfnsToken);

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

          // Wait for blockchain confirmation if the response includes a transaction hash
          // if (completeResponse?.transactionHash && service?.provider?.waitForTransaction) {
          //   console.log("⏳ Waiting for createIdentity tx confirmation:", completeResponse.transactionHash);
          //   toast.update(toastId, { render: "Waiting for blockchain confirmation..." });

          //   const txHash = completeResponse.transactionHash;
          //   const maxAttempts = 10; // roughly ~2 minutes total
          //   const delayMs = 10000; // 10s between retries

          //   let confirmed = false;

          //   for (let i = 0; i < maxAttempts; i++) {
          //     try {
          //       const receipt = await service.provider.waitForTransaction(txHash, 1, delayMs);
          //       if (receipt && receipt.status === 1) {
          //         confirmed = true;
          //         console.log(`Transaction ${txHash} confirmed in block ${receipt.blockNumber}`);
          //         break;
          //       } else {
          //         console.warn(`⚠️ Attempt ${i + 1}: tx not confirmed yet, retrying...`);
          //       }
          //     } catch (err) {
          //       console.warn(`waitForTransaction failed (attempt ${i + 1}/${maxAttempts}):`, err.message);
          //     }

          //     // Wait before retrying
          //     await awaitTimeout(delayMs);
          //   }

          //   if (!confirmed) {
          //     throw new Error(`Transaction ${txHash} not confirmed after ${maxAttempts * (delayMs / 1000)} seconds`);
          //   }
          // } else {
          //   console.log("⚠️ No transaction hash from Dfns, waiting 10s before proceeding...");
          //   await awaitTimeout(10000);
          // }

          return completeResponse;
        };

        await retryWithBackoff(createIdentity, 8, "Create identity");

        // After confirmation, check for identity on-chain
        identity = await retryWithBackoff(async () => await DfnsService.getIdentity(walletAddress), 8, "Get created identity");
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
      } else {
        console.log("Identity already exists:", identity);
        toast.update(toastId, { render: "Identity found, proceeding..." });
      }

      // Step 3: Check if identity is already registered in Blockchain
      if (!identityRegisteredOrExists) {
        let needsRegistration = true;
        try {
          const isRegistered = await retryWithBackoff(async () => await service.isVerified(walletAddress), 8, "Check registration");

          if (isRegistered) {
            console.log("Identity already registered in Blockchain");
            needsRegistration = false;
            identityRegisteredOrExists = true;
            toast.update(toastId, { render: "Identity already registered, updating metadata..." });

            saveOperationState(walletAddr, {
              displayName: trimmedDisplayName,
              accountNumber: trimmedAccountNumber,
              identityCreated: identityCreatedOrExists,
              identityRegistered: true,
              identity,
              completed: false,
            });
          }
        } catch (error) {
          console.log("Error checking registration, will attempt registration:", error);
        }

        // Step 4: Register identity in Blockchain only if needed
        if (needsRegistration) {
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

          // Wait for transaction confirmation if we have a transaction hash
          if (registrationResponse?.transactionHash) {
            toast.update(toastId, { render: "Waiting for blockchain confirmation..." });
          } else {
            // If no transaction hash, wait a bit for the blockchain to process
            await awaitTimeout(3000);
          }

          // Verify registration succeeded
          const isNowRegistered = await waitForVerification(service, walletAddress, 12, 5000);
          console.log("Final verification status:", isNowRegistered);

          if (!isNowRegistered) {
            throw new Error("Registration verification failed - identity not found on blockchain after waiting");
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
        }
      }

      // ONLY proceed with metadata update if identity was successfully created AND registered
      if (!identityCreatedOrExists || !identityRegisteredOrExists) {
        toast.update(toastId, {
          render: "Identity processing incomplete",
          type: "error",
          isLoading: false,
          autoClose: 3000,
        });
        return;
      }

      // Steps 5 and 6 are handled via server trigger for managed wallets

      // 5 and 6 are now done via a server trigger to minimize frontend intera

      // // Step 5: Update identity metadata
      // toast.update(toastId, { render: "Updating identity metadata..." });
      // await service.updateIdentity(walletAddress.toLowerCase(), {
      //   displayName: trimmedDisplayName,
      //   walletAddress: walletAddress.toLowerCase(),
      //   accountNumber: trimmedAccountNumber,
      // });

      // // Step 6: Approve user only if requested via searchParams
      // if (searchParams.has("walletAddress")) {
      //   const userExists = await service.isUser(walletAddress.toLowerCase());
      //   if (userExists) {
      //     toast.update(toastId, { render: "Approving user..." });
      //     await service.approveUser(walletAddress.toLowerCase());
      //   } else {
      //     toast.update(toastId, {
      //       render: `User with wallet address ${walletAddress} does not exist`,
      //       type: "error",
      //       isLoading: false,
      //       autoClose: 3000,
      //     });
      //     return;
      //   }
      // }
      // Mark as completed and clear saved state
      saveOperationState(walletAddr, {
        displayName: trimmedDisplayName,
        accountNumber: trimmedAccountNumber,
        identityCreated: true,
        identityRegistered: true,
        identity,
        completed: true,
      });

      // All steps completed successfully
      toast.update(toastId, {
        render: "Digital Identity processed successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      // Clear the saved state after success
      clearOperationState(walletAddr);
      navigate("/identities");
    } catch (error) {
      const errorInfo = classifyError(error);

      if (errorInfo.type === "USER_CANCELLED" || errorInfo.type === "USER_REJECTED") {
        // User cancelled, keep the saved state for potential resume
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

      // Load any saved state
      const savedState = loadOperationState(walletAddr);
      let identityCreatedOrExists = savedState?.identityCreated || false;
      let identityRegisteredOrExists = savedState?.identityRegistered || false;
      let identity = savedState?.identity || null;

      // Save initial state
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
          identity = await retryWithBackoff(async () => await service.getIdentity(walletAddress), 8, "Get identity");
          console.log("Existing identity check:", identity);

          if (identity && identity !== "0x0000000000000000000000000000000000000000") {
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

          // Wait for transaction to be mined
          await awaitTimeout(2000);

          identity = await retryWithBackoff(async () => await service.getIdentity(walletAddress), 8, "Get created identity");

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

      // Step 3: Check if identity is already registered in Blockchain
      if (!identityRegisteredOrExists) {
        let needsRegistration = true;
        try {
          const isRegistered = await retryWithBackoff(async () => await service.isVerified(walletAddress), 8, "Check registration");

          if (isRegistered) {
            console.log("Identity already registered in Blockchain");
            needsRegistration = false;
            identityRegisteredOrExists = true;
            toast.update(toastId, { render: "Identity already registered, updating metadata..." });

            saveOperationState(walletAddr, {
              displayName: trimmedDisplayName,
              accountNumber: trimmedAccountNumber,
              identityCreated: identityCreatedOrExists,
              identityRegistered: true,
              identity,
              completed: false,
            });
          }
        } catch (error) {
          console.log("Error checking registration, will attempt registration:", error);
        }

        // Step 4: Register identity in Blockchain only if needed
        if (needsRegistration) {
          console.log("Registering identity in Blockchain...");
          toast.update(toastId, { render: "Registering identity in Blockchain..." });

          try {
            const tx = await service.addIdentity(walletAddress, identity);

            // Wait for transaction confirmation
            if (tx?.hash) {
              toast.update(toastId, { render: "Waiting for blockchain confirmation..." });
            } else {
              // If no transaction hash, wait a bit for the blockchain to process
              await awaitTimeout(3000);
            }

            // Verify registration succeeded
            const isNowRegistered = await waitForVerification(service, walletAddress, 12, 5000);
            console.log("Final verification status:", isNowRegistered);

            if (!isNowRegistered) {
              throw new Error("Registration verification failed - identity not found on blockchain after waiting");
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
      }

      // ONLY proceed with metadata update if identity was successfully created AND registered
      // if (!identityCreatedOrExists || !identityRegisteredOrExists) {
      //   toast.update(toastId, {
      //     render: "Identity processing incomplete",
      //     type: "error",
      //     isLoading: false,
      //     autoClose: 3000,
      //   });
      //   return;
      // }

      // Step 5: Update identity metadata
      // toast.update(toastId, { render: "Updating identity metadata..." });
      // try {
      //   await retryWithBackoff(
      //     async () =>
      //       await service.updateIdentity(walletAddr, {
      //         displayName: trimmedDisplayName,
      //         walletAddress: walletAddr,
      //         accountNumber: trimmedAccountNumber,
      //       }),
      //     3,
      //     "Update metadata"
      //   );
      // } catch (error) {
      //   console.error("Error updating identity:", error);
      //   throw error;
      // }

      // Step 6: Approve user only if requested via searchParams
      // if (searchParams.has("walletAddress")) {
      //   const userExists = await service.isUser(walletAddr);
      //   if (userExists) {
      //     toast.update(toastId, { render: "Approving user..." });
      //     await retryWithBackoff(async () => await service.approveUser(walletAddr), 3, "Approve user");
      //   } else {
      //     toast.update(toastId, {
      //       render: `User with wallet address ${walletAddress} does not exist`,
      //       type: "error",
      //       isLoading: false,
      //       autoClose: 3000,
      //     });
      //     return;
      //   }
      // }

      // Mark as completed and clear saved state
      saveOperationState(walletAddr, {
        displayName: trimmedDisplayName,
        accountNumber: trimmedAccountNumber,
        identityCreated: true,
        identityRegistered: true,
        identity,
        completed: true,
      });

      // All steps completed successfully
      toast.update(toastId, {
        render: "Digital Identity processed successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      // Clear the saved state after success
      clearOperationState(walletAddr);
      navigate("/identities");
    } catch (error) {
      const errorInfo = classifyError(error);

      if (errorInfo.type === "USER_CANCELLED" || errorInfo.type === "USER_REJECTED") {
        // User cancelled, keep the saved state for potential resume
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
    </div>
  );
}

export default CreateDigitalId;
