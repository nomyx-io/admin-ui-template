import React, { useEffect } from "react";

import { Breadcrumb, Button, Input } from "antd";
import { Transfer } from "antd";
import { ethers } from "ethers";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { isAlphanumericAndSpace, isEthereumAddress, awaitTimeout } from "../utils";
import { WalletPreference, PAYMENT_ROUTES } from "../utils/Constants";

function SetFunctionClaims({ service }) {
  const navigate = useNavigate();
  const [functionaName, setFunctionaName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [claimTopics, setClaimTopics] = React.useState([]);
  const [targetKeys, setTargetKeys] = React.useState([]);
  const [selectedKeys, setSelectedKeys] = React.useState([]);
  const location = useLocation();

  const { walletPreference, user, dfnsToken } = React.useContext(RoleContext);

  useEffect(() => {
    const routeFunctionName = location.pathname.split("/")[2];
    setFunctionaName(routeFunctionName || "");
  }, [location.pathname]);

  useEffect(() => {
    (async function () {
      if (service.getClaimTopics) {
        const result = await service.getClaimTopics();
        //   const issuerData = await service?.getTrustedIssuersByObjectId(routeFunctionName);
        //   setFunctionaName(issuerData?.attributes?.functionaName || "");
        //   setDescription(issuerData?.attributes?.issuer || "");
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
  }, [service]);

  const onChange = (nextTargetKeys, direction, moveKeys) => {
    setTargetKeys(nextTargetKeys);
  };
  const onSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  function validateSetFunctionRules(functionaName, description, targetKeys) {
    if (functionaName?.trim() === "") {
      toast.error("Function Name is required");
      return false;
    }

    if (targetKeys.length < 1) {
      toast.error("Assign Atleast 1 Compliance Rule");
      return false;
    }

    return true;
  }

  const setFunctionClaims = async () => {
    const trimmedFunctionName = functionaName.trim();
    const functionId = ethers.utils.formatBytes32String(trimmedFunctionName);
    const selectedClaims = targetKeys.map(Number);
    if (!validateSetFunctionRules(trimmedFunctionName, description, targetKeys)) {
      return;
    }

    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              // Initiate adding the trusted issuer
              const { initiateResponse, error: initError } = await DfnsService.initiateSetFunctionClaimRequirements(
                functionId,
                selectedClaims,
                description,
                user.walletId,
                dfnsToken
              );
              if (initError) throw new Error(initError);

              // Complete adding the trusted issuer
              const { completeResponse, error: completeError } = await DfnsService.completeSetFunctionClaimRequirements(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge, // Assuming challenge is part of the initiateResponse
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);
              await new Promise((resolve) => setTimeout(resolve, 6000)); // 4-second delay
              //return completeResponse;
              //   await service.updateTrustedIssuer({
              //     functionaName: trimmedFunctionName,
              //     description: description,
              //     claimTopics: targetKeys.map((topic) => ({ topic, timestamp: Date.now() })), // Assuming you want to add timestamps
              //   });
              navigate("/admin");
            })(),
            {
              pending: "Setting Function Rules...",
              success: `Successfully Set Function Rules ${functionaName}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while setting Function Rules ${functionaName}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to set Function Rules:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        // Handle PRIVATE wallet preference
        toast
          .promise(
            (async () => {
              await service.setFunctionClaims(functionaName, description, targetKeys);
              //   await service.updateTrustedIssuer({
              //     functionaName: trimmedFunctionName,
              //     description: description,
              //     claimTopics: targetKeys.map((topic) => ({ topic, timestamp: Date.now() })), // Assuming you want to add timestamps
              //   });
            })(),
            {
              pending: "Setting Function Rules...",
              success: `Successfully Set Function Rules ${functionaName}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while setting Function Rules ${functionaName}`}</div>;
                },
              },
            }
          )
          .then(() => {
            navigate("/admin");
          })
          .catch((error) => {
            console.error("Error after attempting to set Function Claims:", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during setFunctionClaims:", error);
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
            title: <Link to={"/admin"}>Function Rules</Link>,
          },
          {
            title: "Update",
          },
        ]}
      />
      <p className="text-xl p-6">Set Function Rules</p>
      <hr></hr>
      <div className="p-6 mt-2">
        <div>
          <label htmlFor="functionaName">Function name *</label>
          <div className="mt-3 relative w-full flex border rounded-lg">
            <Input
              id="functionaName"
              value={PAYMENT_ROUTES?.filter((t) => t.value == functionaName)[0]?.label}
              className="border w-full p-2 rounded-lg text-xl"
              placeholder="Function Name"
              type="text"
              maxLength={32}
              onChange={(e) => setFunctionaName(e.target.value)}
              disabled={true}
            />
          </div>
        </div>
        <div className="mt-10 mb-6">
          <label htmlFor="description">Description</label>
          <div className="mt-3 relative w-full flex border rounded-lg">
            <Input
              id="description"
              value={description}
              className="border w-full p-2 rounded-lg text-xl"
              placeholder="Description"
              type="text"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <p className="my-4">Manage Compliance Rule IDs</p>
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
          <Button
            className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white"
            onClick={setFunctionClaims}
          >
            Set Function Rules
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SetFunctionClaims;
