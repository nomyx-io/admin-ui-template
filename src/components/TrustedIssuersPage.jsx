import { useState, useEffect, useCallback, useContext } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";
import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { NomyxAction, WalletPreference } from "../utils/Constants";

const TrustedIssuersPage = ({ service }) => {
  const navigate = useNavigate();
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  // Helper function to extract error message
  const getErrorMessage = (error) => {
    if (typeof error === "string") return error;
    if (error?.reason) return error.reason;
    if (error?.message) return error.message;
    if (error?.toString) return error.toString();
    return "An unknown error occurred";
  };

  const fetchData = useCallback(async () => {
    try {
      const issuers = service.getTrustedIssuers && (await service.getTrustedIssuers());

      let data = [];
      if (issuers) {
        let unnamedCounter = 1; // Counter for unnamed trusted issuers

        issuers.forEach((item) => {
          // Extract and sort claim topics numerically
          const claimTopics = item.attributes.claimTopics || [];
          const sortedTopics = claimTopics
            .map((obj) => parseInt(obj["topic"], 10)) // Convert to numbers
            .filter((topic) => !isNaN(topic)) // Remove any non-numeric values
            .sort((a, b) => a - b) // Sort numerically
            .map((topic) => topic.toString()); // Convert back to strings

          const claimTopicsString = sortedTopics.length > 0 ? sortedTopics.join(", ") : "N/A";

          // Try multiple ways to get verifierName
          let verifierName = item.attributes?.verifierName;

          // If attributes approach fails, try Parse object .get() method
          if (!verifierName && item.get) {
            verifierName = item.get("verifierName");
          }

          // If still no luck, try direct property access
          if (!verifierName && item.verifierName) {
            verifierName = item.verifierName;
          }

          // Generate friendly fallback name if no verifierName found
          const finalVerifierName = verifierName || `Trusted Issuer ${unnamedCounter}`;

          // Increment counter only if we used the fallback name
          if (!verifierName) {
            unnamedCounter++;
          }

          data.push({
            id: item.id,
            claimTopics: claimTopicsString,
            address: item.attributes?.issuer || "Unknown",
            trustedIssuer: finalVerifierName,
          });
        });

        setTrustedIssuers(data);
      }
    } catch (error) {
      console.error("Error fetching trusted issuers:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to fetch trusted issuers: ${errorMessage}`);
    }
  }, [service]);

  useEffect(() => {
    fetchData();
  }, [service, fetchData, refreshTrigger]);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => !prev);
  };

  // Helper function to check if trusted issuer still exists in database
  const checkTrustedIssuerRemoved = async (issuerAddress, maxAttempts = 10, intervalMs = 1000) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const issuers = await service.getTrustedIssuers();
        const stillExists = issuers?.some(
          (issuer) => issuer.attributes.issuer.toLowerCase() === issuerAddress.toLowerCase() && issuer.attributes.active !== false
        );

        if (!stillExists) {
          return true; // Issuer has been removed
        }

        // Wait before next attempt
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        console.error(`Error checking issuer removal status (attempt ${attempt + 1}):`, error);
        // Continue checking even if one attempt fails
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }
    }

    return false; // Timeout - couldn't confirm removal
  };

  const removeTrustedIssuer = async (issuer) => {
    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Handle MANAGED wallet preference using DFNSService
        await toast.promise(
          (async () => {
            try {
              // Step 1: Initiate and complete the blockchain transaction
              const { initiateResponse, error: initError } = await DfnsService.initiateRemoveTrustedIssuer(issuer, user.walletId, dfnsToken);
              if (initError) throw new Error(initError);

              const { completeResponse, error: completeError } = await DfnsService.completeRemoveTrustedIssuer(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge,
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              // Step 2: Wait for the record to actually disappear from the database
              const isRemoved = await checkTrustedIssuerRemoved(issuer);

              if (!isRemoved) {
                throw new Error("Transaction completed but trusted issuer record is still active. Please refresh manually.");
              }

              // Step 3: Trigger refresh now that we've confirmed removal
              triggerRefresh();

              return completeResponse;
            } catch (error) {
              console.error("Error in remove trusted issuer operation:", error);
              throw error;
            }
          })(),
          {
            pending: "Removing Trusted Issuer from blockchain and database...",
            success: `Trusted Issuer ${issuer} has been successfully removed`,
            error: {
              render({ data }) {
                const errorMessage = getErrorMessage(data);
                return <div>{errorMessage || `An error occurred while removing Trusted Issuer ${issuer}`}</div>;
              },
            },
          }
        );
      } else if (walletPreference === WalletPreference.PRIVATE) {
        // Handle PRIVATE wallet preference
        await toast.promise(
          (async () => {
            try {
              // Step 1: Remove from blockchain
              await service.removeTrustedIssuer(issuer);

              // Step 2: Wait for the record to actually disappear from the database
              const isRemoved = await checkTrustedIssuerRemoved(issuer);

              if (!isRemoved) {
                throw new Error("Transaction completed but trusted issuer record is still active. Please refresh manually.");
              }

              // Step 3: Trigger refresh now that we've confirmed removal
              triggerRefresh();

              return true;
            } catch (error) {
              console.error("Error in private wallet remove trusted issuer:", error);
              throw error;
            }
          })(),
          {
            pending: "Removing Trusted Issuer from blockchain and database...",
            success: `Trusted Issuer ${issuer} has been successfully removed`,
            error: {
              render({ data }) {
                const errorMessage = getErrorMessage(data);
                return <div>{errorMessage || `An error occurred while removing Trusted Issuer ${issuer}`}</div>;
              },
            },
          }
        );
      }
    } catch (error) {
      console.error("Unexpected error during removeTrustedIssuer:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(`An unexpected error occurred: ${errorMessage}`);
    }
  };

  const columns = [
    {
      label: "Trusted Issuer",
      name: "trustedIssuer",
      width: "25%",
      render: (row) => (
        <div className="text-[#272b30]">
          <div className="text-base">{row.trustedIssuer || "<No Name>"}</div>
        </div>
      ),
    },
    { label: "Address", name: "address", width: "45%" },
    { label: "Managed Compliance Rules", name: "claimTopics", width: "30%" },
  ];

  const actions = [
    { label: "Update Compliance Rules", name: NomyxAction.UpdateClaimTopics },
    {
      label: "Remove",
      name: NomyxAction.RemoveTrustedIssuer,
      confirmation: "Are you sure you want to remove this Trusted Issuer?",
    },
  ];
  const globalActions = [
    {
      label: "Create Trusted Issuer",
      name: NomyxAction.CreateTrustedIssuer,
      props: { "data-tour": "create-trusted-issuer-btn" },
    },
  ];

  const search = true;

  const handleAction = async (event, name, record) => {
    try {
      switch (name) {
        case NomyxAction.CreateTrustedIssuer:
          navigate("create");
          break;
        case NomyxAction.UpdateClaimTopics:
          navigate("/issuers/" + record.id);
          break;
        case NomyxAction.RemoveTrustedIssuer:
          await removeTrustedIssuer(record.address);
          break;
        default:
          console.log("Unknown action: " + name);
          break;
      }
    } catch (error) {
      console.error("Error in handleAction:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(`Action failed: ${errorMessage}`);
    }
  };

  return (
    <div className="p-6">
      <ObjectList
        title="Trusted Issuers"
        description="Trusted Issuers can create Digital Identities and add Compliance Rules to them"
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

export default TrustedIssuersPage;
