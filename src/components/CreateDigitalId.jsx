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
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              // Step 1: Initiate creating identity
              const { initiateResponse, error: initError } = await DfnsService.initiateCreateIdentity(walletAddress, user.walletId, dfnsToken);
              if (initError) throw new Error(initError);

              // Step 2: Complete creating identity
              const { completeResponse, error: completeError } = await DfnsService.completeCreateIdentity(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge, // Assuming challenge is part of the initiateResponse
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              setTimeout(async () => {
                // Step 3: Get identity details
                const identity = await DfnsService.getIdentity(walletAddress);

                // Step 4: Initiate add identity
                const { initiateResponse, error: initError } = await DfnsService.initiateAddIdentity(
                  walletAddress,
                  identity,
                  user.walletId,
                  dfnsToken
                );
                if (initError) throw new Error(initError);

                // Step 5: Complete add identity
                const { completeResponse, error: completeError } = await DfnsService.completeAddIdentity(
                  user.walletId,
                  dfnsToken,
                  initiateResponse.challenge,
                  initiateResponse.requestBody
                );
                if (completeError) throw new Error(completeError);

                // Step 6: Update identity
                setTimeout(async () => {
                  await service.updateIdentity(walletAddress.toLocaleLowerCase(), {
                    displayName: trimmedDisplayName,
                    walletAddress: walletAddress.toLocaleLowerCase(),
                    accountNumber: trimmedAccountNumber,
                  });

                  // Step 7: Approve user if needed
                  if (searchParams.has("walletAddress")) {
                    const userExists = await service.isUser(walletAddress.toLocaleLowerCase()); // Check if the user exists
                    if (userExists) {
                      await toast.promise(
                        service.approveUser(walletAddress.toLocaleLowerCase()), // Directly pass the promise without awaiting it here
                        {
                          pending: "Approving user...",
                          success: "User approved successfully",
                          error: {
                            render: ({ data }) => <div>{data?.reason || "An error occurred while approving user"}</div>,
                          },
                        }
                      );
                    } else {
                      // Handle the case where the user doesn't exist
                      toast.error(`User with wallet address ${walletAddress} does not exist.`);
                    }
                  }
                  navigate("/identities");
                }, 6000);
              }, 4000);

              //return completeResponse;
            })(),
            {
              pending: "Creating Digital Identity...",
              success: "Digital Identity created successfully",
              error: {
                render: ({ data }) => <div>{data?.reason || "An error occurred while creating Digital Identity"}</div>,
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to create Digital ID:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        // Handle PRIVATE wallet preference
        toast
          .promise(
            (async () => {
              // Step 1: Create identity
              await service.createIdentity(walletAddress);

              // Step 2: Get identity details
              const identity = await service.getIdentity(walletAddress);

              // Step 3: Add identity
              await service.addIdentity(walletAddress, identity);

              // Step 4: Update identity
              try {
                await service.updateIdentity(walletAddress.toLocaleLowerCase(), {
                  displayName: trimmedDisplayName,
                  walletAddress: walletAddress.toLocaleLowerCase(),
                  accountNumber: trimmedAccountNumber,
                });
              } catch (error) {
                // Handle the error gracefully and continue
                console.error("Error updating identity:", error);
              }

              // Step 5: Approve user if needed
              if (searchParams.has("walletAddress")) {
                const userExists = await service.isUser(walletAddress.toLocaleLowerCase()); // Check if the user exists
                if (userExists) {
                  await service.approveUser(walletAddress.toLocaleLowerCase());
                } else {
                  // Handle the case where the user doesn't exist
                  toast.error(`User with wallet address ${walletAddress} does not exist.`);
                }
              }
            })(),
            {
              pending: "Creating Digital Identity...",
              success: "Digital Identity created successfully",
              error: {
                render: ({ data }) => <div>{data?.reason || "An error occurred while creating Digital Identity"}</div>,
              },
            }
          )
          .then(() => {
            navigate("/identities");
          })
          .catch((error) => {
            console.error("Error after attempting to create Digital ID:", error);
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
