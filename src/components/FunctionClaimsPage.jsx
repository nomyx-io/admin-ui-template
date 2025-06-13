import { useState, useEffect, useCallback, useContext } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";
import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { NomyxAction, WalletPreference } from "../utils/Constants";

const FunctionClaimsPage = ({ service }) => {
  const navigate = useNavigate();
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  const fetchData = useCallback(async () => {
    const issuers = service.getTrustedIssuers && (await service.getTrustedIssuers());
    let data = [];
    if (issuers) {
      issuers.forEach((item) => {
        const claimTopicsString = item.attributes.claimTopics?.map((obj) => obj["topic"]).join(",") || "N/A";
        data.push({
          id: item.id,
          claimTopics: claimTopicsString,
          address: item.attributes.issuer,
          trustedIssuer: item.attributes.verifierName,
        });
      });
      setTrustedIssuers(data);
    }
  }, [service]);

  useEffect(() => {
    fetchData();
  }, [service, fetchData]);

  // const addTrustedIssuer = async (issuer, claimTopics) => {
  //   await service.addTrustedIssuer(issuer, claimTopics);
  // };

  const removeFunctionClaims = async (issuer) => {
    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              // Initiate removal of the trusted issuer
              const { initiateResponse, error: initError } = await DfnsService.initiateRemoveTrustedIssuer(issuer, user.walletId, dfnsToken);
              if (initError) throw new Error(initError);

              // Complete removal of the trusted issuer
              const { completeResponse, error: completeError } = await DfnsService.completeRemoveTrustedIssuer(
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
              pending: "Removing Trusted Issuer...",
              success: `Successfully Removed Trusted Issuer ${issuer}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while removing Trusted Issuer ${issuer}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to remove Trusted Issuer:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        // Handle PRIVATE wallet preference
        toast
          .promise(
            (async () => {
              await service.removeTrustedIssuer(issuer);
              fetchData();
            })(),
            {
              pending: "Removing Trusted Issuer...",
              success: `Successfully Removed Trusted Issuer ${issuer}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while removing Trusted Issuer ${issuer}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to remove Trusted Issuer:", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during removeFunctionClaims:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const columns = [
    { label: "Function", name: "trustedIssuer", width: "25%" },
    { label: "Compliance Rules", name: "claimTopics", width: "30%" },
  ];

  const actions = [
    { label: "Update Function Claims", name: NomyxAction.UpdateFunctionClaims },
    {
      label: "Remove",
      name: NomyxAction.DeleteFunctionClaims,
      confirmation: "Are you sure you want to remove this Function Claim?",
    },
  ];
  const globalActions = [{ label: "Set Function Claims", name: NomyxAction.SetFunctionClaims }];

  const search = true;

  const handleAction = async (event, name, record) => {
    switch (name) {
      case NomyxAction.SetFunctionClaims:
        navigate("create");
        break;
      case NomyxAction.UpdateFunctionClaims:
        navigate("/function-claims/" + record.id);
        break;
      case NomyxAction.DeleteFunctionClaims:
        removeFunctionClaims(record.address);
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
        globalActions={globalActions}
        search={search}
        data={trustedIssuers}
        pageSize={10}
        onAction={handleAction}
        onGlobalAction={handleAction}
      />
    </div>
  );
};

export default FunctionClaimsPage;
