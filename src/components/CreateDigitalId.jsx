import { useState, useContext, useEffect } from "react";

import { Breadcrumb, Button, Input } from "antd";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext"; // Import RoleContext
import DfnsService from "../services/DfnsService";
import { isEthereumAddress } from "../utils";
import { awaitTimeout } from "../utils";
import { WalletPreference } from "../utils/Constants";

function CreateDigitalId({ service }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const navigate = useNavigate();

  const { walletPreference, user, dfnsToken } = useContext(RoleContext); // Access walletPreference and other necessary data from context

  const [displayName, setDisplayName] = useState(searchParams.get("displayName") || "");
  const [walletAddress, setWalletAddress] = useState(searchParams.get("walletAddress") || "");
  const [accountNumber, setAccountNumber] = useState(searchParams.get("accountNumber") || "");
  const [isTrustedIssuer, setIsTrustedIssuer] = useState(false);
  const [isCheckingTrustedIssuer, setIsCheckingTrustedIssuer] = useState(true);

  // Check if current user is a trusted issuer on component mount
  useEffect(() => {
    const checkTrustedIssuer = async () => {
      if (!user?.walletAddress) {
        setIsCheckingTrustedIssuer(false);
        return;
      }

      try {
        setIsCheckingTrustedIssuer(true);
        const isTrusted = await service.isTrustedIssuer(user.walletAddress);
        setIsTrustedIssuer(isTrusted);

        if (!isTrusted) {
          toast.error("Please create a trusted issuer for your address in order to create an identity.");
        }
      } catch (error) {
        console.error("Error checking trusted issuer status:", error);
        toast.error("Failed to verify trusted issuer status. Please try again.");
        setIsTrustedIssuer(false);
      } finally {
        setIsCheckingTrustedIssuer(false);
      }
    };

    checkTrustedIssuer();
  }, [user?.walletAddress, service]);

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

  const handleCreateDigitalId = async () => {
    const trimmedDisplayName = displayName.trim();
    const trimmedAccountNumber = accountNumber.trim();

    if (!validateDigitalID(trimmedDisplayName, walletAddress, trimmedAccountNumber)) {
      return;
    }

    try {
      if (walletPreference === WalletPreference.MANAGED) {
        await processManagedWallet(trimmedDisplayName, trimmedAccountNumber);
      } else if (walletPreference === WalletPreference.PRIVATE) {
        await processPrivateWallet(trimmedDisplayName, trimmedAccountNumber);
      }
    } catch (error) {
      // Only log unexpected errors that weren't already handled
      if (error.message !== "USER_CANCELLED" || error.message !== "USER_REJECTED") {
        console.error("Unexpected error in digital ID flow:", error);
      }
    }
  };

  const processManagedWallet = async (trimmedDisplayName, trimmedAccountNumber) => {
    let toastId = null;

    try {
      toastId = toast.loading("Processing Digital Identity...");

      let identityCreatedOrExists = false;
      let identityRegisteredOrExists = false;
      let identity = null;

      // Step 1: Check if identity already exists
      try {
        identity = await DfnsService.getIdentity(walletAddress);
        console.log("Existing identity check:", identity);
      } catch (error) {
        console.log("No existing identity found, will create new one");
      }

      // Step 2: Create identity only if it doesn't exist
      if (!identity || identity === "0x0000000000000000000000000000000000000000") {
        console.log("Creating new identity...");
        toast.update(toastId, { render: "Creating identity..." });

        const { initiateResponse, error: initError } = await DfnsService.initiateCreateIdentity(walletAddress, user.walletId, dfnsToken);

        if (initError) {
          if (initError.includes("cancel")) {
            toast.update(toastId, {
              render: "Identity creation cancelled",
              type: "warning",
              isLoading: false,
              autoClose: 3000,
            });
            throw new Error("USER_CANCELLED");
          } else if (initError.includes("reject")) {
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
          if (completeError.includes("cancel")) {
            toast.update(toastId, {
              render: "Identity creation cancelled",
              type: "warning",
              isLoading: false,
              autoClose: 3000,
            });
            throw new Error("USER_CANCELLED");
          } else if (completeError.includes("reject")) {
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

        identity = await DfnsService.getIdentity(walletAddress);
        console.log("New identity created:", identity);
        if (completeResponse) identityCreatedOrExists = true;
      } else {
        console.log("Identity already exists:", identity);
        toast.update(toastId, { render: "Identity found, proceeding..." });
        identityCreatedOrExists = true;
      }

      // Step 3: Check if identity is already registered in Blockchain
      let needsRegistration = true;
      try {
        const isRegistered = await service.isVerified(walletAddress);
        if (isRegistered) {
          console.log("Identity already registered in Blockchain");
          needsRegistration = false;
          identityRegisteredOrExists = true;
          toast.update(toastId, { render: "Identity already registered, updating metadata..." });
        }
      } catch (error) {
        console.log("Error checking registration, proceeding with registration:", error);
      }

      // Step 4: Register identity in Blockchain only if needed
      if (needsRegistration) {
        console.log("Registering identity in Blockchain...");
        toast.update(toastId, { render: "Registering identity on blockchain." });

        const { addIdentityInitResponse, error: addIdentityInitError } = await DfnsService.initiateAddIdentity(
          walletAddress,
          identity,
          user.walletId,
          dfnsToken
        );

        if (addIdentityInitError) {
          if (addIdentityInitError.includes("cancel")) {
            toast.update(toastId, {
              render: "Identity registration cancelled",
              type: "warning",
              isLoading: false,
              autoClose: 3000,
            });
            throw new Error("USER_CANCELLED");
          } else if (addIdentityInitError.includes("reject")) {
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
          if (addIdentityCompleteError.includes("cancel")) {
            toast.update(toastId, {
              render: "Identity registration cancelled",
              type: "warning",
              isLoading: false,
              autoClose: 3000,
            });
            throw new Error("USER_CANCELLED");
          } else if (addIdentityCompleteError.includes("reject")) {
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

        console.log("Identity registered in Blockchain successfully");
        if (addIdentityCompleteResponse) identityRegisteredOrExists = true;
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

      // All steps completed successfully
      toast.update(toastId, {
        render: "Digital Identity processed successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      navigate("/identities");
    } catch (error) {
      if (error.message === "USER_CANCELLED" || error.message === "USER_REJECTED") {
        // Already handled by toast.update above, just exit gracefully
        return;
      }

      console.error("Error in managed wallet flow:", error);
      if (toastId) {
        toast.update(toastId, {
          render: error?.reason || error?.message || "An error occurred while processing Digital Identity",
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

    try {
      toastId = toast.loading("Processing Digital Identity...");

      let identityCreatedOrExists = false;
      let identityRegisteredOrExists = false;
      let identity = null;

      // Step 1: Check if identity already exists
      try {
        identity = await service.getIdentity(walletAddress);
        console.log("Existing identity check:", identity);
      } catch (error) {
        console.log("No existing identity found, will create new one");
      }

      // Step 2: Create identity only if it doesn't exist
      if (!identity || identity === "0x0000000000000000000000000000000000000000") {
        console.log("Creating new identity...");
        toast.update(toastId, { render: "Creating identity..." });

        try {
          await service.createIdentity(walletAddress);
          identity = await service.getIdentity(walletAddress);
          console.log("New identity created:", identity);
          identityCreatedOrExists = true;
        } catch (error) {
          if (error.code === 4001 || error.message?.includes("cancel")) {
            toast.update(toastId, {
              render: "Identity creation cancelled",
              type: "warning",
              isLoading: false,
              autoClose: 3000,
            });
            throw new Error("USER_CANCELLED");
          } else if (error.message?.includes("reject")) {
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
        identityCreatedOrExists = true;
      }

      // Step 3: Check if identity is already registered in Blockchain
      let needsRegistration = true;
      try {
        const isRegistered = await service.isVerified(walletAddress);
        if (isRegistered) {
          console.log("Identity already registered in Blockchain");
          needsRegistration = false;
          identityRegisteredOrExists = true;
          toast.update(toastId, { render: "Identity already registered, updating metadata..." });
        }
      } catch (error) {
        console.log("Error checking registration, proceeding with registration:", error);
      }

      // Step 4: Register identity in Blockchain only if needed
      if (needsRegistration) {
        console.log("Registering identity in Blockchain...");
        toast.update(toastId, { render: "Registering identity in Blockchain..." });

        try {
          await service.addIdentity(walletAddress, identity);
          console.log("Identity registered in Blockchain successfully");
          identityRegisteredOrExists = true;
        } catch (error) {
          if (error.code === 4001 || error.message?.includes("cancel")) {
            toast.update(toastId, {
              render: "Identity registration cancelled",
              type: "warning",
              isLoading: false,
              autoClose: 3000,
            });
            throw new Error("USER_CANCELLED");
          } else if (error.message?.includes("reject")) {
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

      // Step 5: Update identity metadata
      toast.update(toastId, { render: "Updating identity metadata..." });
      try {
        await service.updateIdentity(walletAddress.toLowerCase(), {
          displayName: trimmedDisplayName,
          walletAddress: walletAddress.toLowerCase(),
          accountNumber: trimmedAccountNumber,
        });
      } catch (error) {
        console.error("Error updating identity:", error);
        throw error;
      }

      // Step 6: Approve user only if requested via searchParams
      if (searchParams.has("walletAddress")) {
        const userExists = await service.isUser(walletAddress.toLowerCase());
        if (userExists) {
          toast.update(toastId, { render: "Approving user..." });
          await service.approveUser(walletAddress.toLowerCase());
        } else {
          toast.update(toastId, {
            render: `User with wallet address ${walletAddress} does not exist`,
            type: "error",
            isLoading: false,
            autoClose: 3000,
          });
          return;
        }
      }

      // All steps completed successfully
      toast.update(toastId, {
        render: "Digital Identity processed successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      navigate("/identities");
    } catch (error) {
      if (error.message === "USER_CANCELLED" || error.message === "USER_REJECTED") {
        // Already handled by toast.update above, just exit gracefully
        return;
      }

      console.error("Error in private wallet flow:", error);
      if (toastId) {
        toast.update(toastId, {
          render: error?.reason || error?.message || "An error occurred while processing Digital Identity",
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
            />
            <p className="absolute right-5 top-3">{displayName.length}/32</p>
          </div>
          <p>User-friendly name that describes the identity. Shown to end-users</p>
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
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end max-[600px]:justify-center">
          <Button onClick={handleCreateDigitalId} className="nomyx-id-button max-[600px]:w-[60%] min-w-max text-center font-semibold h-11">
            Create Digital Id
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreateDigitalId;
