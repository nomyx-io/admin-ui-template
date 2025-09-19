import { useState, useEffect, useCallback, useContext } from "react";

import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";
import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { NomyxAction, WalletPreference, PAYMENT_ROUTES } from "../utils/Constants";

const FunctionClaimsPage = ({ service }) => {
  const navigate = useNavigate();
  const [functionRules, setFunctionRules] = useState([]);
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  const fetchData = useCallback(async () => {
    try {
      const functionClaims = service.getFunctionCompliances && (await service.getFunctionCompliances());

      const data = PAYMENT_ROUTES.map((route) => {
        const matchedClaim = functionClaims?.find((t) => t?.attributes?.functionId === route.value);

        // Sort compliance rules if they exist
        let sortedClaimTopics = "";
        if (matchedClaim?.attributes?.requiredClaimTopics) {
          const claimTopicsArray = matchedClaim.attributes.requiredClaimTopics.map((obj) => obj);
          // Sort the array (assuming they are strings or numbers)
          claimTopicsArray.sort((a, b) => {
            // Handle different data types
            if (typeof a === "string" && typeof b === "string") {
              return a.localeCompare(b);
            }
            if (typeof a === "number" && typeof b === "number") {
              return a - b;
            }
            // Convert to string and compare if mixed types
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

  // const addTrustedIssuer = async (issuer, claimTopics) => {
  //   await service.addTrustedIssuer(issuer, claimTopics);
  // };

  const removeFunctionClaims = async (functionName) => {
    const functionId = ethers.utils.id(functionName);
    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              // Initiate removal of the function rules
              const { initiateResponse, error: initError } = await DfnsService.initiateSetFunctionClaimRequirements(
                functionId,
                [],
                "",
                user.walletId,
                dfnsToken
              );
              if (initError) throw new Error(initError);

              // Complete removal of the function rules
              const { completeResponse, error: completeError } = await DfnsService.completeSetFunctionClaimRequirements(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge, // Assuming challenge is part of the initiateResponse
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              // Fetch updated data after successful removal
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
        // Handle PRIVATE wallet preference
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
  //   const globalActions = [{ label: "Set Function Claims", name: NomyxAction.SetFunctionClaims }];

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

  return (
    <div className="p-6">
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
  );
};

export default FunctionClaimsPage;
