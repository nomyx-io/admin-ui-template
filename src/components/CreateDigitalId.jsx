import { Breadcrumb, Button, Input } from "antd";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { isAlphanumericAndSpace, isEthereumAddress, awaitTimeout } from "../utils";

function CreateDigitalId({ service }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const [displayName, setDisplayName] = useState(searchParams.get("displayName") || "");
  const [walletAddress, setWalletAddress] = useState(searchParams.get("walletAddress") || "");
  const [accountNumber, setAccountNumber] = useState(searchParams.get("accountNumber") || "");

  const navigate = useNavigate();

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
    if (!validateDigitalID(displayName.trim(), walletAddress, accountNumber.trim())) {
      return; // Early return if validation fails
    }

    try {
      // Step 1: Create identity
      await toast.promise(
        service.createIdentity(walletAddress), // Assume this returns a promise
        {
          pending: "Creating Digital Identity...",
          success: "Digital Identity created successfully",
          error: {
            render: ({ data }) => <div>{data?.reason || "An error occurred while creating Digital Identity"}</div>,
          },
        }
      );

      // Step 2: Get identity details
      const identity = await toast.promise(
        service.getIdentity(walletAddress), // Assume this returns a promise
        {
          pending: "Fetching identity details...",
          success: "Identity details fetched successfully",
          error: {
            render: ({ data }) => <div>{data?.reason || "An error occurred while fetching identity details"}</div>,
          },
        }
      );

      // Step 3: Add identity
      await toast.promise(
        service.addIdentity(walletAddress, identity), // Assume this returns a promise
        {
          pending: "Adding identity...",
          success: "Identity added successfully",
          error: {
            render: ({ data }) => <div>{data?.reason || "An error occurred while adding identity"}</div>,
          },
        }
      );
      try {
        // Step 4: Update identity
        await toast.promise(
          service.updateIdentity(walletAddress.toLocaleLowerCase(), {
            displayName: displayName.trim(),
            walletAddress: walletAddress.toLocaleLowerCase(),
            accountNumber: accountNumber.trim(),
          }), // Assume this returns a promise
          {
            pending: "Updating identity...",
            success: "Identity updated successfully",
            error: {
              render: ({ data }) => <div>{data?.reason || "An error occurred while updating identity"}</div>,
            },
          }
        );
      } catch (error) {
        // Handle the error gracefully and continue
        console.error("Error updating identity:", error);
      }

      // Step 5: Approve user if needed
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
    } catch (error) {
      toast.error("Error: " + error);
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
