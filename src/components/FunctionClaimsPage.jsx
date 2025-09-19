import { useState, useEffect, useCallback, useContext } from "react";

import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Tabs, Button, Breadcrumb, Input, InputNumber } from "antd";
import { ethers } from "ethers";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";
import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { isEthereumAddress } from "../utils";
import { NomyxAction, WalletPreference, PAYMENT_ROUTES } from "../utils/Constants";

const FunctionClaimsPage = ({ service }) => {
  const navigate = useNavigate();
  const [functionRules, setFunctionRules] = useState([]);
  const [activeTab, setActiveTab] = useState("1");

  // Initiate Token state
  const [tokenAddress, setTokenAddress] = useState("");
  const [feeReceivers, setFeeReceivers] = useState([{ address: "", percentage: 100 }]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalWeightBasis] = useState(10000); // Hardcoded to 10000 as per deployment
  const [feesEnabled, setFeesEnabled] = useState(false);

  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  const fetchData = useCallback(async () => {
    try {
      const functionClaims = service.getFunctionCompliances && (await service.getFunctionCompliances());

      const data = PAYMENT_ROUTES.map((route) => {
        const matchedClaim = functionClaims?.find((t) => t?.attributes?.functionId === route.value);

        let sortedClaimTopics = "";
        if (matchedClaim?.attributes?.requiredClaimTopics) {
          const claimTopicsArray = matchedClaim.attributes.requiredClaimTopics.map((obj) => obj);
          claimTopicsArray.sort((a, b) => {
            if (typeof a === "string" && typeof b === "string") {
              return a.localeCompare(b);
            }
            if (typeof a === "number" && typeof b === "number") {
              return a - b;
            }
            return String(a).localeCompare(String(b));
          });
          sortedClaimTopics = claimTopicsArray.join(",");
        }

        return {
          functionName: route.value,
          functionLabel: route.label,
          claimTopics: sortedClaimTopics,
        };
      });

      setFunctionRules(data);
    } catch (error) {
      console.error("Error fetching function compliance data:", error);
    }
  }, [service]);

  useEffect(() => {
    fetchData();
  }, [service, fetchData]);

  const removeFunctionClaims = async (functionName) => {
    const functionId = ethers.utils.id(functionName);
    try {
      if (walletPreference === WalletPreference.MANAGED) {
        toast
          .promise(
            (async () => {
              const { initiateResponse, error: initError } = await DfnsService.initiateSetFunctionClaimRequirements(
                functionId,
                [],
                "",
                user.walletId,
                dfnsToken
              );
              if (initError) throw new Error(initError);

              const { completeResponse, error: completeError } = await DfnsService.completeSetFunctionClaimRequirements(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge,
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              setTimeout(fetchData, 3000);
            })(),
            {
              pending: "Removing Function Rules...",
              success: `Successfully Removed Function Rules ${functionName}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while removing Function Rules ${functionName}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to remove Function Rules:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        toast
          .promise(
            (async () => {
              await service.setFunctionClaims(functionName, "", []);
              fetchData();
            })(),
            {
              pending: "Removing Function Rules...",
              success: `Successfully Removed Function Rules ${functionName}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while removing Function Rules ${functionName}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to remove Function Rules:", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during removeFunctionClaims:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  // UPDATED: include feesEnabled so we can skip receiver validation when disabled
  const validateTokenFeeReceivers = (tokenAddress, feeReceivers, feesEnabled) => {
    if (!tokenAddress?.trim()) {
      toast.error("Token address is required");
      return false;
    }

    if (!isEthereumAddress(tokenAddress)) {
      toast.error("Invalid token address");
      return false;
    }

    // Zero-fee mode: we will submit empty arrays; skip receiver checks
    if (!feesEnabled) return true;

    if (!feeReceivers || feeReceivers.length === 0) {
      toast.error("At least one fee receiver is required");
      return false;
    }

    let totalPercentage = 0;
    for (const receiver of feeReceivers) {
      if (!receiver.address?.trim()) {
        toast.error("All receiver addresses are required");
        return false;
      }
      if (!isEthereumAddress(receiver.address)) {
        toast.error(`Invalid receiver address: ${receiver.address}`);
        return false;
      }
      if (!receiver.percentage || receiver.percentage <= 0) {
        toast.error("All percentages must be positive numbers");
        return false;
      }
      totalPercentage += receiver.percentage;
    }

    if (totalPercentage !== 100) {
      toast.error("Total percentages must equal 100%");
      return false;
    }

    return true;
  };

  // UPDATED: branch to submit []/[] when fees are disabled
  const setTokenFeeReceivers = async () => {
    const trimmedTokenAddress = tokenAddress.trim();
    if (!validateTokenFeeReceivers(trimmedTokenAddress, feeReceivers, feesEnabled)) {
      return;
    }

    const receiverAddresses = feesEnabled ? feeReceivers.map((r) => r.address) : [];
    const receiverWeights = feesEnabled ? feeReceivers.map((r) => Math.round((r.percentage / 100) * totalWeightBasis)) : [];

    try {
      setIsLoading(true);
      if (walletPreference === WalletPreference.MANAGED) {
        toast
          .promise(
            (async () => {
              const { initiateResponse, error: initError } = await DfnsService.initiateSetTokenFeeReceivers(
                trimmedTokenAddress,
                receiverAddresses,
                receiverWeights,
                user.walletId,
                dfnsToken
              );
              if (initError) throw new Error(initError);

              const { completeResponse, error: completeError } = await DfnsService.completeSetTokenFeeReceivers(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge,
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              setTokenAddress("");
              setFeeReceivers(feesEnabled ? [{ address: "", percentage: 100 }] : []);
              await new Promise((resolve) => setTimeout(resolve, 2000));
            })(),
            {
              pending: "Initiating Token ...",
              success: `Successfully set fee config for ${trimmedTokenAddress}${feesEnabled ? "" : " (no fees)"}`,
              error: {
                render({ data }) {
                  return <div>{data?.message || `An error occurred while setting Initiating Token`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to Initiated Token:", error);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        toast
          .promise(
            (async () => {
              await service.setTokenFeeReceivers(trimmedTokenAddress, receiverAddresses, receiverWeights);
              setTokenAddress("");
              setFeeReceivers(feesEnabled ? [{ address: "", percentage: 100 }] : []);
            })(),
            {
              pending: "Initiating Token ...",
              success: `Successfully set fee config for ${trimmedTokenAddress}${feesEnabled ? "" : " (no fees)"}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while setting Initiating Token`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to Initiated Token:", error);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    } catch (error) {
      console.error("Unexpected error during setTokenFeeReceivers:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const addFeeReceiver = () => {
    setFeeReceivers([...feeReceivers, { address: "", percentage: 0 }]);
  };

  const removeFeeReceiver = (index) => {
    if (feeReceivers.length > 1) {
      const newReceivers = feeReceivers.filter((_, i) => i !== index);
      setFeeReceivers(newReceivers);
    } else if (feeReceivers.length === 1) {
      setFeeReceivers([]);
    }
  };

  const updateFeeReceiver = (index, field, value) => {
    const newReceivers = [...feeReceivers];
    newReceivers[index][field] = value;
    setFeeReceivers(newReceivers);
  };

  const columns = [
    { label: "Function", name: "functionLabel", width: "25%" },
    { label: "Compliance Rules", name: "claimTopics", width: "30%" },
  ];

  const actions = [
    { label: "Update Function Rules", name: NomyxAction.UpdateFunctionClaims },
    {
      label: "Remove",
      name: NomyxAction.DeleteFunctionClaims,
      confirmation: "Are you sure you want to remove this Function Rules?",
    },
  ];

  const search = true;

  const handleAction = async (event, name, record) => {
    switch (name) {
      case NomyxAction.SetFunctionClaims:
        navigate("create");
        break;
      case NomyxAction.UpdateFunctionClaims:
        navigate("/function-claims/" + record.functionName);
        break;
      case NomyxAction.DeleteFunctionClaims:
        removeFunctionClaims(record.functionName);
        break;
      default:
        console.log("Unknown action: " + name);
        break;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "1":
        return "Function Claims";
      case "2":
        return "Initiate Token";
      default:
        return "Function Claims";
    }
  };

  const tabItems = [
    {
      key: "1",
      label: "Function Claims",
      children: (
        <div className="p-6 mt-2">
          <ObjectList
            title="Function Claims"
            description="Function Claims"
            columns={columns}
            actions={actions}
            search={search}
            data={functionRules}
            pageSize={10}
            onAction={handleAction}
            onGlobalAction={handleAction}
          />
        </div>
      ),
    },
    {
      key: "2",
      label: "Initiate Token",
      children: (
        <div className="p-6 mt-2">
          <div>
            <label htmlFor="tokenAddress">Token Address *</label>
            <div className="mt-3 relative w-full flex border rounded-lg">
              <Input
                id="tokenAddress"
                value={tokenAddress}
                className="border w-full p-2 rounded-lg text-xl"
                placeholder="0x..."
                type="text"
                onChange={(e) => setTokenAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={feesEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setFeesEnabled(enabled);
                  if (!enabled) {
                    // Zero-fee mode: submit empty arrays
                    setFeeReceivers([]);
                  } else {
                    // Start with a single row at 100%
                    setFeeReceivers([{ address: "", percentage: 100 }]);
                  }
                }}
                className="mr-2"
              />
              Enable fee distribution for this token
            </label>
            <p className="text-sm text-gray-600 mt-1">
              {feesEnabled
                ? "Configure multiple fee receivers below"
                : "No fee distribution will be applied (submits empty fee config to the contract)."}
            </p>
          </div>

          {feesEnabled && (
            <>
              <div className="mt-10 mb-6">
                <p className="my-4">Configure Fee Receivers & Weights</p>
                <p className="text-sm text-gray-600 mb-4">
                  Add addresses that will receive fees and their corresponding percentages. Percentages must total 100%.
                </p>
              </div>
            </>
          )}

          <div className="my-5">
            {feesEnabled &&
              feeReceivers.map((receiver, index) => (
                <div key={index} className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Fee Receiver {index + 1}</h4>
                    {feeReceivers.length > 0 && (
                      <Button
                        type="default"
                        danger
                        className="flex items-center gap-1"
                        icon={<MinusCircleOutlined />}
                        onClick={() => removeFeeReceiver(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor={`address-${index}`}>Receiver Address *</label>
                      <div className="mt-3 relative w-full flex border rounded-lg">
                        <Input
                          id={`address-${index}`}
                          value={receiver.address}
                          className="border w-full p-2 rounded-lg text-xl"
                          placeholder="Wallet Address"
                          type="text"
                          onChange={(e) => updateFeeReceiver(index, "address", e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor={`percentage-${index}`}>Percentage *</label>
                      <div className="mt-3 relative w-full flex border rounded-lg">
                        <InputNumber
                          id={`percentage-${index}`}
                          value={receiver.percentage}
                          className="border w-full p-2 rounded-lg text-xl"
                          placeholder="Percentage"
                          min={1} // Contract requires > 0 when enabled
                          max={100}
                          formatter={(value) => `${value}%`}
                          parser={(value) => value.replace("%", "")}
                          onChange={(value) => updateFeeReceiver(index, "percentage", value)}
                          style={{ width: "100%" }}
                          controls={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {feesEnabled && (
              <Button type="dashed" onClick={addFeeReceiver} icon={<PlusOutlined />} className="w-full mb-6" size="large">
                Add Fee Receiver
              </Button>
            )}
          </div>

          <div className="flex justify-end max-[600px]:justify-center">
            <Button
              className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white"
              onClick={setTokenFeeReceivers}
              loading={isLoading}
              disabled={isLoading}
            >
              Initiate Token
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb
        className="bg-transparent"
        items={[
          {
            title: <Link to={"/"}>Home</Link>,
          },
          {
            title: <Link to={"/admin"}>Admin</Link>,
          },
          {
            title: getTabTitle(),
          },
        ]}
      />
      <p className="text-xl p-6">{getTabTitle()}</p>
      <hr />

      <Tabs defaultActiveKey="1" items={tabItems} onChange={setActiveTab} className="px-6" />
    </div>
  );
};

export default FunctionClaimsPage;
