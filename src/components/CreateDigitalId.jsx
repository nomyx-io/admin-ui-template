import { useState, useContext } from "react";

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
      return; // Early return if validation fails
    }

    try {
      if (walletPreference === WalletPreference.MANAGED) {
        console.log("wallet Address: ", walletAddress);
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              try {
                let identityCreatedOrExists = false;
                let identityRegisteredOrExists = false;

                // Step 1: Check if identity already exists
                let identity = null;
                try {
                  identity = await DfnsService.getIdentity(walletAddress);
                  console.log("Existing identity check:", identity);
                } catch (error) {
                  console.log("No existing identity found, will create new one");
                }

                // Step 2: Create identity only if it doesn't exist
                if (!identity || identity === "0x0000000000000000000000000000000000000000") {
                  console.log("Creating new identity...");

                  const { initiateResponse, error: initError } = await DfnsService.initiateCreateIdentity(walletAddress, user.walletId, dfnsToken);
                  if (initError) throw new Error(initError);

                  const { completeResponse, error: completeError } = await DfnsService.completeCreateIdentity(
                    user.walletId,
                    dfnsToken,
                    initiateResponse.challenge,
                    initiateResponse.requestBody
                  );
                  if (completeError) throw new Error(completeError);

                  // Get the newly created identity
                  identity = await DfnsService.getIdentity(walletAddress);
                  console.log("New identity created:", identity);
                  identityCreatedOrExists = true;
                } else {
                  console.log("Identity already exists, skipping creation:", identity);
                  toast.info("Identity already exists for this address, proceeding with registration");
                  identityCreatedOrExists = true;
                }

                // Step 3: Check if identity is already registered in Diamond
                let needsRegistration = true;
                try {
                  const isRegistered = await service.isVerified(walletAddress);
                  if (isRegistered) {
                    console.log("Identity already registered in Diamond");
                    needsRegistration = false;
                    toast.info("Identity already registered in Diamond, skipping registration");
                    identityRegisteredOrExists = true;
                  }
                } catch (error) {
                  console.log("Error checking registration, proceeding with registration:", error);
                }

                // Step 4: Register identity in Diamond only if needed
                if (needsRegistration) {
                  console.log("Registering identity in Diamond...");

                  const { addIdentityInitResponse, error: addIdentityInitError } = await DfnsService.initiateAddIdentity(
                    walletAddress,
                    identity,
                    user.walletId,
                    dfnsToken
                  );
                  if (addIdentityInitError) throw new Error(addIdentityInitError);

                  const { addIdentityCompleteResponse, error: addIdentityCompleteError } = await DfnsService.completeAddIdentity(
                    user.walletId,
                    dfnsToken,
                    addIdentityInitResponse.challenge,
                    addIdentityInitResponse.requestBody
                  );
                  if (addIdentityCompleteError) throw new Error(addIdentityCompleteError);

                  console.log("Identity registered in Diamond successfully");
                  identityRegisteredOrExists = true;
                }

                // Step 5: Update identity metadata
                await service.updateIdentity(walletAddress.toLowerCase(), {
                  displayName: trimmedDisplayName,
                  walletAddress: walletAddress.toLowerCase(),
                  accountNumber: trimmedAccountNumber,
                });

                // Step 6: Approve user only if identity was created/exists AND registered/exists
                if (searchParams.has("walletAddress") && identityCreatedOrExists && identityRegisteredOrExists) {
                  const userExists = await service.isUser(walletAddress.toLowerCase());
                  if (userExists) {
                    await toast.promise(service.approveUser(walletAddress.toLowerCase()), {
                      pending: "Approving user...",
                      success: "User approved successfully",
                      error: {
                        render: ({ data }) => <div>{data?.reason || "An error occurred while approving user"}</div>,
                      },
                    });
                  } else {
                    toast.error(`User with wallet address ${walletAddress} does not exist.`);
                  }
                }
                navigate("/identities");
              } catch (err) {
                console.error("Error in digital ID flow:", err);
                throw err; // toast handles error display
              }
            })(),
            {
              pending: "Processing Digital Identity...",
              success: "Digital Identity processed successfully",
              error: {
                render: ({ data }) => <div>{data?.reason || "An error occurred while processing Digital Identity"}</div>,
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to process Digital ID:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        // Handle PRIVATE wallet preference
        toast
          .promise(
            (async () => {
              let identityCreatedOrExists = false;
              let identityRegisteredOrExists = false;

              // Step 1: Check if identity already exists
              let identity = null;
              try {
                identity = await service.getIdentity(walletAddress);
                console.log("Existing identity check:", identity);
              } catch (error) {
                console.log("No existing identity found, will create new one");
              }

              // Step 2: Create identity only if it doesn't exist
              if (!identity || identity === "0x0000000000000000000000000000000000000000") {
                console.log("Creating new identity...");
                await service.createIdentity(walletAddress);
                identity = await service.getIdentity(walletAddress);
                console.log("New identity created:", identity);
                identityCreatedOrExists = true;
              } else {
                console.log("Identity already exists, skipping creation:", identity);
                toast.info("Identity already exists for this address, proceeding with registration");
                identityCreatedOrExists = true;
              }

              // Step 3: Check if identity is already registered in Diamond
              let needsRegistration = true;
              try {
                const isRegistered = await service.isVerified(walletAddress);
                if (isRegistered) {
                  console.log("Identity already registered in Diamond");
                  needsRegistration = false;
                  toast.info("Identity already registered in Diamond, skipping registration");
                  identityRegisteredOrExists = true;
                }
              } catch (error) {
                console.log("Error checking registration, proceeding with registration:", error);
              }

              // Step 4: Register identity in Diamond only if needed
              if (needsRegistration) {
                console.log("Registering identity in Diamond...");
                await service.addIdentity(walletAddress, identity);
                console.log("Identity registered in Diamond successfully");
                identityRegisteredOrExists = true;
              }

              // Step 5: Update identity metadata
              try {
                await service.updateIdentity(walletAddress.toLowerCase(), {
                  displayName: trimmedDisplayName,
                  walletAddress: walletAddress.toLowerCase(),
                  accountNumber: trimmedAccountNumber,
                });
              } catch (error) {
                console.error("Error updating identity:", error);
              }

              // Step 6: Approve user only if identity was created/exists AND registered/exists
              if (searchParams.has("walletAddress") && identityCreatedOrExists && identityRegisteredOrExists) {
                const userExists = await service.isUser(walletAddress.toLowerCase());
                if (userExists) {
                  await service.approveUser(walletAddress.toLowerCase());
                } else {
                  toast.error(`User with wallet address ${walletAddress} does not exist.`);
                }
              }
            })(),
            {
              pending: "Processing Digital Identity...",
              success: "Digital Identity processed successfully",
              error: {
                render: ({ data }) => <div>{data?.reason || "An error occurred while processing Digital Identity"}</div>,
              },
            }
          )
          .then(() => {
            navigate("/identities");
          })
          .catch((error) => {
            console.error("Error after attempting to process Digital ID:", error);
          });
      }
    } catch (error) {
      toast.error("Error: " + error.message || error);
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
          <p>User-friendly name that describes the trusted issuers.Shown to end-users</p>
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
