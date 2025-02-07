import React, { useEffect } from "react";

import { Breadcrumb, Button, Input } from "antd";
import { Transfer } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { isAlphanumericAndSpace, isEthereumAddress, awaitTimeout } from "../utils";
import { WalletPreference } from "../utils/Constants";

function CreateTrustedIssuer({ service }) {
  const navigate = useNavigate();
  const [verifierName, setVerifierName] = React.useState("");
  const [walletAddress, setWalletAddress] = React.useState("");
  const [claimTopics, setClaimTopics] = React.useState([]);
  const [targetKeys, setTargetKeys] = React.useState([]);
  const [selectedKeys, setSelectedKeys] = React.useState([]);
  const location = useLocation();

  const { walletPreference, user, dfnsToken } = React.useContext(RoleContext);

  let id = location.pathname.split("/")[2];
  useEffect(() => {
    (async function () {
      if (service.getClaimTopics && service.getTrustedIssuersByObjectId) {
        const result = await service.getClaimTopics();
        const issuerData = await service?.getTrustedIssuersByObjectId(id);
        setVerifierName(issuerData?.attributes?.verifierName || "");
        setWalletAddress(issuerData?.attributes?.issuer || "");
        let newArr = [];
        setTargetKeys(newArr || "");
        let data = [];

        if (result) {
          result.forEach((item) => {
            data.push({
              key: item.attributes?.topic,
              displayName: item.attributes?.displayName,
              id: item.id,
              topic: item.attributes?.topic,
            });
          });
          setClaimTopics(data);
        }
      }
    })();
  }, [service, id]);

  const onChange = (nextTargetKeys, direction, moveKeys) => {
    setTargetKeys(nextTargetKeys);
  };
  const onSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  function validateTrustedIssuer(verifierName, walletAddress, targetKeys) {
    if (verifierName?.trim() === "") {
      toast.error("Trusted Issuer display Name is required");
      return false;
    }

    if (!isAlphanumericAndSpace(verifierName)) {
      toast.error("Trusted Issuer display Name must contain only alphanumeric characters");
      return false;
    }

    if (walletAddress === "") {
      toast.error("Trusted Issuer Wallet is required");
      return false;
    }

    if (!isEthereumAddress(walletAddress)) {
      toast.error("Invalid Ethereum Wallet Address in Trusted Issuer Wallet Address");
      return false;
    }

    if (targetKeys.length < 1) {
      toast.error("Assign Atleast 1 Claim Topics");
      return false;
    }

    return true;
  }

  const saveTrustedIssuer = async () => {
    const trimmedVerifierName = verifierName.trim();

    if (!validateTrustedIssuer(trimmedVerifierName, walletAddress, targetKeys)) {
      return;
    }

    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              // Initiate adding the trusted issuer
              const { initiateResponse, error: initError } = await DfnsService.initiateAddTrustedIssuer(
                walletAddress,
                targetKeys,
                user.walletId,
                dfnsToken
              );
              if (initError) throw new Error(initError);

              // Complete adding the trusted issuer
              const { completeResponse, error: completeError } = await DfnsService.completeAddTrustedIssuer(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge, // Assuming challenge is part of the initiateResponse
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              //return completeResponse;
              setTimeout(async () => {
                await service.updateTrustedIssuer({
                  verifierName: trimmedVerifierName,
                  issuer: walletAddress,
                  claimTopics: targetKeys.map((topic) => ({ topic, timestamp: Date.now() })), // Assuming you want to add timestamps
                });
              }, 3000);
            })(),
            {
              pending: "Adding Trusted Issuer...",
              success: `Successfully Added Trusted Issuer ${walletAddress}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while adding Trusted Issuer ${walletAddress}`}</div>;
                },
              },
            }
          )
          .then(() => {
            navigate("/issuers");
          })
          .catch((error) => {
            console.error("Error after attempting to add Trusted Issuer:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        // Handle PRIVATE wallet preference
        toast
          .promise(
            (async () => {
              await service.addTrustedIssuer(walletAddress, targetKeys);
              await service.updateTrustedIssuer({
                verifierName: trimmedVerifierName,
                issuer: walletAddress,
                claimTopics: targetKeys.map((topic) => ({ topic, timestamp: Date.now() })), // Assuming you want to add timestamps
              });
            })(),
            {
              pending: "Adding Trusted Issuer...",
              success: `Successfully Added Trusted Issuer ${walletAddress}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while adding Trusted Issuer ${walletAddress}`}</div>;
                },
              },
            }
          )
          .then(() => {
            navigate("/issuers");
          })
          .catch((error) => {
            console.error("Error after attempting to add Trusted Issuer:", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during saveTrustedIssuer:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const updateTrustedIssuer = async () => {
    const trimmedVerifierName = verifierName.trim();

    if (!validateTrustedIssuer(trimmedVerifierName, walletAddress, targetKeys)) {
      return;
    }

    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              // Initiate updating the trusted issuer
              const { initiateResponse, error: initError } = await DfnsService.initiateUpdateTrustedIssuer(
                walletAddress,
                targetKeys,
                user.walletId,
                dfnsToken
              );
              if (initError) throw new Error(initError);

              // Complete updating the trusted issuer
              const { completeResponse, error: completeError } = await DfnsService.completeUpdateTrustedIssuer(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge, // Assuming challenge is part of the initiateResponse
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              return completeResponse;
            })(),
            {
              pending: "Updating Trusted Issuer...",
              success: `Successfully Updated Trusted Issuer ${walletAddress}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while updating Trusted Issuer ${walletAddress}`}</div>;
                },
              },
            }
          )
          .then(() => {
            navigate("/issuers");
          })
          .catch((error) => {
            console.error("Error after attempting to update Trusted Issuer:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        // Handle PRIVATE wallet preference
        toast
          .promise(
            (async () => {
              const keysWithTimestamps = targetKeys.map((topic) => ({
                topic,
                timestamp: Date.now(),
              }));
              await service.updateIssuerClaimTopics(walletAddress, targetKeys);
              await service.updateTrustedIssuer({
                verifierName: trimmedVerifierName,
                issuer: walletAddress,
                claimTopics: keysWithTimestamps,
              });
            })(),
            {
              pending: "Updating Trusted Issuer...",
              success: `Successfully Updated Trusted Issuer ${walletAddress}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while updating Trusted Issuer ${walletAddress}`}</div>;
                },
              },
            }
          )
          .then(() => {
            navigate("/issuers");
          })
          .catch((error) => {
            console.error("Error after attempting to update Trusted Issuer:", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during updateTrustedIssuer:", error);
      toast.error("An unexpected error occurred. Please try again.");
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
            title: <Link to={"/issuers"}>Trusted Issuer</Link>,
          },
          {
            title: id === "create" ? "Add" : "Update",
          },
        ]}
      />
      <p className="text-xl p-6">Create Trusted Issuer</p>
      <hr></hr>
      <div className="p-6 mt-2">
        <div>
          <label htmlFor="trustedIssuerName">Trusted Issuer display name *</label>
          <div className="mt-3 relative w-full flex border rounded-lg">
            <Input
              id="trustedIssuerName"
              value={verifierName}
              className="border w-full p-2 rounded-lg text-xl"
              placeholder="ID Verifier Name"
              type="text"
              maxLength={32}
              onChange={(e) => setVerifierName(e.target.value)}
            />
            <p className="absolute right-5 top-3">{verifierName.length}/32</p>
          </div>
        </div>
        <div className="mt-10 mb-6">
          <label htmlFor="trustedIssuerWallet">Trusted Issuer Wallet *</label>
          <div className="mt-3 relative w-full flex border rounded-lg">
            <Input
              id="trustedIssuerWallet"
              value={walletAddress}
              className="border w-full p-2 rounded-lg text-xl"
              placeholder="Wallet Address"
              type="text"
              onChange={(e) => (id === "create" ? setWalletAddress(e.target.value.trim()) : "")}
            />
          </div>
          <p className="my-4">Manage Claim Topic IDs</p>
        </div>
        <div className="my-5">
          <Transfer
            className="w-full"
            showSelectAll={false}
            dataSource={claimTopics}
            titles={["Available Claims", "Selected Claims"]}
            targetKeys={targetKeys}
            selectedKeys={selectedKeys}
            onChange={onChange}
            onSelectChange={onSelectChange}
            render={(item) => (
              <div>
                {item?.displayName}({item.topic})
              </div>
            )}
            listStyle={{ width: "50%", minWidth: "120px" }}
          />
        </div>
        <div className="flex justify-end max-[600px]:justify-center">
          {id === "create" ? (
            <Button
              className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white"
              onClick={saveTrustedIssuer}
            >
              Create Trusted Issuer
            </Button>
          ) : (
            <Button
              className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white"
              onClick={updateTrustedIssuer}
            >
              Update Trusted Issuer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateTrustedIssuer;
