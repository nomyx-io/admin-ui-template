import { useState, useContext, useEffect } from "react";

import { Breadcrumb, Button, Input } from "antd";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { isEthereumAddress } from "../utils";
import { WalletPreference } from "../utils/Constants";
import { waitForIndexer, retryDbWrite } from "../utils/indexerWait";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Validation ----------
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

  // ---------- Error Classification ----------
  function classifyError(error) {
    const errorMsg = error?.message || error?.reason || "";

    if (errorMsg.includes("nonce") || error?.code === "NONCE_EXPIRED") {
      return {
        type: "NONCE_ERROR",
        retryable: true,
        userMessage: "Blockchain sync issue. Please try again after some time.",
      };
    }
    if (errorMsg.includes("gas")) {
      return { type: "GAS_ERROR", retryable: false, userMessage: "Insufficient gas" };
    }
    if (errorMsg.includes("already exists") || errorMsg.includes("duplicate")) {
      return { type: "DUPLICATE", retryable: false, userMessage: "Identity already exists" };
    }
    if (error?.code === 4001 || errorMsg.includes("cancel")) {
      return { type: "USER_CANCELLED", retryable: false, userMessage: "Operation cancelled" };
    }
    if (errorMsg.includes("reject")) {
      return { type: "USER_REJECTED", retryable: false, userMessage: "Operation rejected" };
    }

    return { type: "UNKNOWN", retryable: false, userMessage: errorMsg };
  }

  // ---------- LocalStorage State Persistence ----------
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

  function clearOperationState(walletAddr) {
    const stateKey = `identity-creation-${walletAddr.toLowerCase()}`;
    try {
      localStorage.removeItem(stateKey);
    } catch (e) {
      console.error("Failed to clear state:", e);
    }
  }

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

  // ---------- Indexer-aware helpers (built on the shared utility) ----------

  /**
   * Wait until DfnsService.getIdentity(walletAddress) returns a non-zero identity.
   * Throws if not indexed within the configured attempts.
   */
  const waitForIdentityOnChain = async (walletAddr, getIdentityFn, toastId) => {
    return waitForIndexer(
      async () => {
        const result = await getIdentityFn(walletAddr);
        return result && result !== ZERO_ADDRESS ? result : null;
      },
      {
        resourceName: `Identity for ${walletAddr}`,
        maxAttempts: 12,
        onAttempt: (attempt, max) => {
          if (toastId) {
            toast.update(toastId, {
              render: `Waiting for identity on-chain... (${attempt}/${max})`,
            });
          }
        },
      }
    );
  };

  /**
   * Wait until service.isVerified(walletAddress) returns true.
   * Used after registration to confirm on-chain registry inclusion.
   */
  const waitForRegistrationOnChain = async (walletAddr, toastId) => {
    return waitForIndexer(
      async () => {
        const isRegistered = await service.isVerified(walletAddr);
        return isRegistered ? true : null;
      },
      {
        resourceName: `Registration of ${walletAddr}`,
        maxAttempts: 12,
        onAttempt: (attempt, max) => {
          if (toastId) {
            toast.update(toastId, {
              render: `Confirming on-chain registration... (${attempt}/${max})`,
            });
          }
        },
      }
    );
  };

  /**
   * Helper to handle USER_CANCELLED / USER_REJECTED toast updates uniformly.
   * Returns true if the error was a user cancel/reject (and should be re-thrown).
   */
  const handleUserAbort = (errMsgOrError, toastId, action) => {
    const errorInfo = classifyError(typeof errMsgOrError === "string" ? { message: errMsgOrError } : errMsgOrError);

    if (errorInfo.type === "USER_CANCELLED") {
      toast.update(toastId, {
        render: `${action} cancelled`,
        type: "warning",
        isLoading: false,
        autoClose: 3000,
      });
      return "USER_CANCELLED";
    }
    if (errorInfo.type === "USER_REJECTED") {
      toast.update(toastId, {
        render: `${action} rejected`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      return "USER_REJECTED";
    }
    return null;
  };

  // ---------- Entry Point ----------
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

  // ---------- MANAGED wallet flow ----------
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

      // ---------- Step 1: Check if identity already exists on-chain ----------
      if (!identity || identity === ZERO_ADDRESS) {
        try {
          // Use waitForIndexer with low attempts as a "check, but don't insist"
          identity = await waitForIndexer(
            async () => {
              const result = await DfnsService.getIdentity(walletAddress);
              return result && result !== ZERO_ADDRESS ? result : null;
            },
            { resourceName: `Existing identity check ${walletAddress}`, maxAttempts: 2 }
          ).catch(() => null);

          if (identity && identity !== ZERO_ADDRESS) {
            console.log("Existing identity found:", identity);
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
          console.log("No existing identity found, will create a new one");
        }
      }

      // ---------- Step 2: Create identity if it doesn't exist ----------
      if (!identityCreatedOrExists) {
        console.log("Creating new identity...");
        toast.update(toastId, { render: "Creating identity..." });

        let createInitResponse;
        try {
          const initResult = await DfnsService.initiateCreateIdentity(walletAddress, user.walletId, dfnsToken);
          if (initResult?.error) throw new Error(initResult.error);
          createInitResponse = initResult.initiateResponse;
        } catch (err) {
          const abortType = handleUserAbort(err, toastId, "Identity creation");
          if (abortType) throw new Error(abortType);

          const msg = err?.reason || err?.message || "Identity creation failed";
          toast.update(toastId, {
            render: msg,
            type: "error",
            isLoading: false,
            autoClose: 6000,
          });
          throw err; // STOP. Don't poll.
        }

        try {
          const completeResult = await DfnsService.completeCreateIdentity(
            user.walletId,
            dfnsToken,
            createInitResponse.challenge,
            createInitResponse.requestBody
          );
          if (completeResult?.error) throw new Error(completeResult.error);
        } catch (err) {
          const abortType = handleUserAbort(err, toastId, "Identity creation");
          if (abortType) throw new Error(abortType);

          const msg = err?.reason || err?.message || "Identity creation failed";
          toast.update(toastId, {
            render: msg,
            type: "error",
            isLoading: false,
            autoClose: 6000,
          });
          throw err; // STOP. Don't poll.
        }

        // Broadcast succeeded — now poll for the identity on-chain
        identity = await waitForIdentityOnChain(walletAddress, DfnsService.getIdentity, toastId);
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

      // ---------- Step 3 & 4: Register identity in Blockchain (Identity Registry) ----------
      if (!identityRegisteredOrExists) {
        console.log("Registering identity in Blockchain...");
        toast.update(toastId, { render: "Registering identity on blockchain..." });

        // --- DFNS broadcast: must succeed before we wait for indexer ---
        let addIdentityInitResponse;
        try {
          const initResult = await DfnsService.initiateAddIdentity(walletAddress, identity, user.walletId, dfnsToken);
          if (initResult?.error) throw new Error(initResult.error);
          addIdentityInitResponse = initResult.addIdentityInitResponse;
        } catch (err) {
          const abortType = handleUserAbort(err, toastId, "Identity registration");
          if (abortType) throw new Error(abortType);

          const msg = err?.reason || err?.message || "Identity registration failed";
          toast.update(toastId, {
            render: msg,
            type: "error",
            isLoading: false,
            autoClose: 6000,
          });
          throw err; // STOP. No polling, no retries.
        }

        let completeResponse;
        try {
          const completeResult = await DfnsService.completeAddIdentity(
            user.walletId,
            dfnsToken,
            addIdentityInitResponse.challenge,
            addIdentityInitResponse.requestBody
          );
          if (completeResult?.error) throw new Error(completeResult.error);
          completeResponse = completeResult.addIdentityCompleteResponse;
        } catch (err) {
          const abortType = handleUserAbort(err, toastId, "Identity registration");
          if (abortType) throw new Error(abortType);

          const msg = err?.reason || err?.message || "Identity registration failed";
          toast.update(toastId, {
            render: msg,
            type: "error",
            isLoading: false,
            autoClose: 6000,
          });
          throw err; // STOP. No polling, no retries.
        }

        // --- Broadcast succeeded. NOW it's safe to wait for the indexer. ---
        console.log("Broadcast successful, waiting for on-chain confirmation:", completeResponse);
        await waitForRegistrationOnChain(walletAddress, toastId);

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

      // ---------- Steps 5 & 6 are handled by a server-side trigger for managed wallets ----------
      // (metadata update + user approval). Frontend just needs to mark complete.

      saveOperationState(walletAddr, {
        displayName: trimmedDisplayName,
        accountNumber: trimmedAccountNumber,
        identityCreated: true,
        identityRegistered: true,
        identity,
        completed: true,
      });

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
        // Keep saved state so user can resume
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

  // ---------- PRIVATE wallet flow ----------
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

      // ---------- Step 1: Check if identity already exists on-chain ----------
      if (!identity || identity === ZERO_ADDRESS) {
        try {
          identity = await waitForIndexer(
            async () => {
              const result = await service.getIdentity(walletAddress);
              return result && result !== ZERO_ADDRESS ? result : null;
            },
            { resourceName: `Existing identity check ${walletAddress}`, maxAttempts: 2 }
          ).catch(() => null);

          if (identity && identity !== ZERO_ADDRESS) {
            console.log("Existing identity found:", identity);
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
          console.log("No existing identity found, will create a new one");
        }
      }

      // ---------- Step 2: Create identity if it doesn't exist ----------
      if (!identityCreatedOrExists) {
        console.log("Creating new identity...");
        toast.update(toastId, { render: "Creating identity..." });

        try {
          await service.createIdentity(walletAddress);

          // Wait for the identity to be readable on-chain (replaces the old fixed 2s sleep)
          identity = await waitForIdentityOnChain(walletAddress, service.getIdentity.bind(service), toastId);

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
          const abortType = handleUserAbort(error, toastId, "Identity creation");
          if (abortType) throw new Error(abortType);
          throw error;
        }
      } else {
        console.log("Identity already exists:", identity);
        toast.update(toastId, { render: "Identity found, proceeding..." });
      }

      // ---------- Step 3 & 4: Register identity in Blockchain ----------
      if (!identityRegisteredOrExists) {
        console.log("Registering identity in Blockchain...");
        toast.update(toastId, { render: "Registering identity in Blockchain..." });

        try {
          await service.addIdentity(walletAddress, identity);

          // Wait for the registry to reflect the registration on-chain
          await waitForRegistrationOnChain(walletAddress, toastId);

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
          const abortType = handleUserAbort(error, toastId, "Identity registration");
          if (abortType) throw new Error(abortType);
          throw error;
        }
      }

      // ---------- Step 5: Update identity metadata (off-chain) ----------
      // If you re-enable metadata writes here, use retryDbWrite for transient failures:
      //
      // toast.update(toastId, { render: "Updating identity metadata..." });
      // await retryDbWrite(
      //   () =>
      //     service.updateIdentity(walletAddr, {
      //       displayName: trimmedDisplayName,
      //       walletAddress: walletAddr,
      //       accountNumber: trimmedAccountNumber,
      //     }),
      //   { operationName: "Update identity metadata" }
      // );

      // ---------- Step 6: Approve user (off-chain) ----------
      // if (searchParams.has("walletAddress")) {
      //   const userExists = await service.isUser(walletAddr);
      //   if (userExists) {
      //     toast.update(toastId, { render: "Approving user..." });
      //     await retryDbWrite(() => service.approveUser(walletAddr), { operationName: "Approve user" });
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

      saveOperationState(walletAddr, {
        displayName: trimmedDisplayName,
        accountNumber: trimmedAccountNumber,
        identityCreated: true,
        identityRegistered: true,
        identity,
        completed: true,
      });

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
        // Keep saved state so user can resume
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

  // ---------- Render ----------
  return (
    <div>
      <Breadcrumb
        className="bg-transparent"
        items={[{ title: <Link to={"/"}>Home</Link> }, { title: <Link to={"/identities"}>Identities</Link> }, { title: "Add" }]}
      />
      <p className="text-xl p-6">Create Digital Id</p>
      <hr />
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
