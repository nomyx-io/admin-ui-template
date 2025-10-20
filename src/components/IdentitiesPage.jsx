import { useState, useEffect, useCallback, useContext } from "react";

import { Tabs } from "antd";
import Parse from "parse";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import InvestmentRequestModal from "./InvestmentRequestModal"; // Import the new modal
import ObjectList from "./ObjectList";
import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { NomyxAction } from "../utils/Constants";
import { WalletPreference } from "../utils/Constants";

const { TabPane } = Tabs;

const IdentitiesPage = ({ service }) => {
  const navigate = useNavigate();
  const [identities, setIdentities] = useState([]);
  const [pendingIdentities, setPendingIdentities] = useState([]);
  const [activeTab, setActiveTab] = useState("Identities");
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New state for investment request modal
  const [investmentModalVisible, setInvestmentModalVisible] = useState(false);
  const [selectedIdentityForInvestment, setSelectedIdentityForInvestment] = useState(null);
  const [tokenProjects, setTokenProjects] = useState([]);

  // Helper function to extract error message
  const getErrorMessage = (error) => {
    if (typeof error === "string") return error;
    if (error?.reason) return error.reason;
    if (error?.message) return error.message;
    if (error?.toString) return error.toString();
    return "An unknown error occurred";
  };

  function getTemplateNameById(inquiryTemplateId) {
    const templateMap = {};

    if (process.env.REACT_APP_PERSONA_KYB_TEMPLATEID) {
      templateMap[process.env.REACT_APP_PERSONA_KYB_TEMPLATEID] = "KYB";
    }

    if (process.env.REACT_APP_PERSONA_KYC_TEMPLATEID) {
      templateMap[process.env.REACT_APP_PERSONA_KYC_TEMPLATEID] = "KYC";
    }

    if (process.env.REACT_APP_PERSONA_ACCREDITED_INVESTOR_TEMPLATEID) {
      templateMap[process.env.REACT_APP_PERSONA_ACCREDITED_INVESTOR_TEMPLATEID] = "Accredited US Investor";
    }

    if (process.env.REACT_APP_PERSONA_QUALIFIED_INVESTOR_TEMPLATEID) {
      templateMap[process.env.REACT_APP_PERSONA_QUALIFIED_INVESTOR_TEMPLATEID] = "EU Qualified Investor";
    }

    return templateMap[inquiryTemplateId] || null;
  }

  // Fetch token projects
  const fetchTokenProjects = useCallback(async () => {
    try {
      if (service && service.getTokenProjects) {
        const projects = await service.getTokenProjects();
        setTokenProjects(projects || []);
      }
    } catch (error) {
      console.error("Error fetching token projects:", error);
      toast.error("Failed to fetch token projects");
    }
  }, [service]);

  // Fetch token projects on component mount
  useEffect(() => {
    fetchTokenProjects();
  }, [fetchTokenProjects]);

  const fetchData = useCallback(
    async (tab) => {
      try {
        let fetchedIdentities = [];
        if (service) {
          if (tab === "Identities" || tab === "Claims") {
            // Fetch active identities for Identities and Claims tabs
            fetchedIdentities = await service.getActiveIdentities();
            fetchedIdentities = fetchedIdentities.map((identity) => {
              let identidyObj = {};
              if (identity && identity.attributes) {
                // Map active identities fields
                const claimsArray = identity.attributes.claims || [];

                // Sort claims numerically before joining
                const sortedClaims = claimsArray
                  .map((claim) => parseInt(claim, 10)) // Convert to numbers
                  .filter((claim) => !isNaN(claim)) // Remove any non-numeric values
                  .sort((a, b) => a - b) // Sort numerically
                  .map((claim) => claim.toString()); // Convert back to strings

                identidyObj.claims = sortedClaims.join(", "); // Convert sorted claims array to comma-separated string
                identidyObj.displayName = identity.attributes.displayName || "";
                identidyObj.kyc_id = identity.attributes.accountNumber || "";
                identidyObj.identityAddress = identity.attributes.address || "";
                identidyObj.id = identity.id;
                identidyObj.pepMatched = identity?.pepMatched || false;
                identidyObj.watchlistMatched = identity?.watchlistMatched || false;
                // Parse the JSON string
                const json = identity?.personaVerificationData ? JSON.parse(identity?.personaVerificationData) : {};
                // Safely access the inquiry-template ID
                const inquiryTemplateId =
                  json?.data?.attributes?.payload?.data?.relationships?.inquiry_template?.data?.id ||
                  json?.data?.attributes?.payload?.data?.relationships?.["inquiry-template"]?.data?.id;
                if (inquiryTemplateId) {
                  identidyObj.recommended_compliance_rules = getTemplateNameById(inquiryTemplateId);
                } else {
                  identidyObj.recommended_compliance_rules = "";
                }
              } else {
                // Default empty values if attributes are missing
                identidyObj.claims = "";
                identidyObj.displayName = "";
                identidyObj.kyc_id = "";
                identidyObj.identityAddress = "";
                identidyObj.id = "";
                identidyObj.pepMatched = false;
                identidyObj.watchlistMatched = false;
                identidyObj.recommended_compliance_rules = "";
              }
              return identidyObj;
            });

            if (tab === "Claims") {
              fetchedIdentities = fetchedIdentities.filter((identity) => !identity.claims || identity.claims.length === 0);
            }
          } else if (tab === "Pending") {
            fetchedIdentities = await service.getPendingIdentities();
            fetchedIdentities = fetchedIdentities.map((identity) => {
              const firstName = identity.attributes.firstName || "";
              const lastName = identity.attributes.lastName || "";
              const personaData = identity.attributes.personaVerificationData ? JSON.parse(identity.attributes.personaVerificationData) : {};

              const templateId =
                personaData?.data?.attributes?.payload?.data?.relationships?.inquiry_template?.data?.id ||
                personaData?.data?.attributes?.payload?.data?.relationships?.["inquiry-template"]?.data?.id ||
                "";
              const identityType =
                templateId === process.env.REACT_APP_PERSONA_KYC_TEMPLATEID
                  ? "KYC"
                  : templateId === process.env.REACT_APP_PERSONA_KYB_TEMPLATEID
                    ? "KYB"
                    : "";

              const name = personaData?.data?.attributes?.name || "";
              const status = name.split(".")[1]?.toUpperCase() || "";

              return {
                displayName: `${firstName} ${lastName}`.trim(), // Concatenate first and last names
                identityAddress: identity.attributes.walletAddress || "", // Wallet address remains the same
                kyc_id: identity.attributes.personaReferenceId || "", // KYC ID set to personaReferenceId
                pepMatched: identity.attributes.pepMatched,
                watchlistMatched: identity.attributes.watchlistMatched,
                type: identityType || "", // Type of identity
                status: status || "", // Status of identity
                recommended_compliance_rules: templateId ? getTemplateNameById(templateId) : "",
                ...identity, // Include other identity attributes as is
              };
            });
          }
        } else {
          console.error("Service object is not available");
        }

        // Set the state for identities or pending identities
        if (tab === "Identities" || tab === "Claims") {
          setIdentities(fetchedIdentities);
        } else if (tab === "Pending") {
          setPendingIdentities(fetchedIdentities);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        const errorMessage = getErrorMessage(error);
        toast.error(`Failed to fetch data: ${errorMessage}`);
      }
    },
    [service]
  );

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, service, refreshTrigger, fetchData]);

  const handleDelayedRefresh = useCallback(
    async (retryCount = 0, maxRetries = 3) => {
      const delays = [2000, 4000, 6000]; // 2s, 4s, 6s delays

      if (retryCount < maxRetries) {
        setIsRefreshing(true);

        setTimeout(async () => {
          try {
            await fetchData(activeTab);

            // Check if we got updated data, if not retry
            // You might want to add additional logic here to verify the data is actually updated
            if (retryCount < maxRetries - 1) {
              handleDelayedRefresh(retryCount + 1, maxRetries);
            } else {
              setIsRefreshing(false);
            }
          } catch (error) {
            console.error("Error during delayed refresh:", error);
            setIsRefreshing(false);
          }
        }, delays[retryCount] || 6000);
      } else {
        setIsRefreshing(false);
      }
    },
    [activeTab, fetchData]
  );

  // Add this useEffect to handle navigation-triggered refresh
  useEffect(() => {
    if (location.state?.refresh) {
      // Immediate refresh
      fetchData(activeTab);

      // Then delayed refreshes to catch blockchain updates
      handleDelayedRefresh();

      // Clear the state to prevent repeated refreshes
      window.history.replaceState({}, document.title);
    }
  }, [location.state, activeTab, fetchData, handleDelayedRefresh]);

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const handleRemoveUser = async (record) => {
    const { displayName, identityAddress } = record;
    toast
      .promise(
        async () => {
          const deleted = await service.softRemoveUser(identityAddress);
          //console.log('deleted: ', deleted);
          return deleted; // Return the deleted status
        },
        {
          pending: `Removing ${displayName}...`,
          success: (deleted) => {
            if (deleted) {
              return `${displayName} has been successfully removed.`;
            } else {
              throw new Error(`${displayName} couldn't be removed.`);
            }
          },
          error: {
            render({ data }) {
              const errorMessage = getErrorMessage(data);
              return `${displayName} couldn't be removed: ${errorMessage}`;
            },
          },
        }
      )
      .then(() => {
        fetchData(activeTab); // Trigger fetchData after removal is complete
      })
      .catch((error) => {
        console.error("Error in handleRemoveUser:", error);
      });
  };

  const handleRemoveIdentity = async (event, action, record) => {
    if (walletPreference === WalletPreference.MANAGED) {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const identities = [record.identityAddress];
      for (const identity of identities) {
        try {
          await toast.promise(
            (async () => {
              try {
                // Step 1: Initiate Remove Identity
                const { initiateResponse, error: removeInitError } = await DfnsService.initiateRemoveIdentity(identity, user.walletId, dfnsToken);
                if (removeInitError) throw new Error(removeInitError);

                // Step 2: Complete Remove Identity
                const { completeResponse, error: removeCompleteError } = await DfnsService.completeRemoveIdentity(
                  user.walletId,
                  dfnsToken,
                  initiateResponse.challenge,
                  initiateResponse.requestBody
                );
                if (removeCompleteError) throw new Error(removeCompleteError);

                // Step 3: Delay before initiating Unregister Identity
                await delay(2000);

                // Step 4: Initiate Unregister Identity
                const { initiateResponse: unregisterInitResponse, error: unregisterInitError } = await DfnsService.initiateUnregisterIdentity(
                  identity,
                  user.walletId,
                  dfnsToken
                );
                if (unregisterInitError) throw new Error(unregisterInitError);

                // Step 5: Complete Unregister Identity
                const { completeResponse: unregisterCompleteResponse, error: unregisterCompleteError } = await DfnsService.completeUnregisterIdentity(
                  user.walletId,
                  dfnsToken,
                  unregisterInitResponse.challenge,
                  unregisterInitResponse.requestBody
                );
                if (unregisterCompleteError) throw new Error(unregisterCompleteError);

                // Step 6: Delay before refreshing state
                await delay(2500);
                setRefreshTrigger((prev) => !prev);
              } catch (error) {
                console.error("Error in remove identity operation:", error);
                throw error;
              }
            })(),
            {
              pending: `Removing ${record?.displayName}...`,
              success: `Successfully removed ${record?.displayName}`,
              error: {
                render({ data }) {
                  const errorMessage = getErrorMessage(data);
                  return <div>{errorMessage || `An error occurred while removing ${record?.displayName}`}</div>;
                },
              },
            }
          );
        } catch (error) {
          console.error(`Error removing identity ${identity}:`, error);
        }
      }
    } else if (walletPreference === WalletPreference.PRIVATE) {
      toast.promise(
        async () => {
          try {
            const identities = [record.identityAddress];

            for (const identity of identities) {
              // Step 1: Call removeIdentity
              await service.removeIdentity(identity);
              // Step 2: Call unregisterIdentity
              await service.unregisterIdentity(identity);
            }

            // After successful removal, trigger a refresh of the component
            setRefreshTrigger((prev) => !prev); // This needs to be tested upon updated removal event contract redeployment
          } catch (error) {
            console.error("Error in private wallet remove identity:", error);
            throw error;
          }
        },
        {
          pending: `Removing ${record?.displayName}...`,
          success: `Successfully removed ${record?.displayName}`,
          error: {
            render({ data }) {
              const errorMessage = getErrorMessage(data);
              return <div>{errorMessage || `An error occurred while removing ${record?.displayName}`}</div>;
            },
          },
        }
      );
    }
  };

  // Handle investment request submission
  const handleInvestmentRequestSubmit = async (requestData) => {
    try {
      // Call Parse Cloud Function
      const result = await Parse.Cloud.run("sendInvestmentRequest", {
        identityId: requestData.identityId,
        identityAddress: requestData.identityAddress,
        projectIds: requestData.projectIds,
        subject: requestData.subject,
        emailBody: requestData.emailBody,
      });

      if (result.success) {
        toast.success("Investment request sent successfully!");
        console.log("Investment request ID:", result.requestId);
      } else {
        throw new Error(result.message || "Failed to send investment request");
      }
    } catch (error) {
      console.error("Error sending investment request:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to send investment request: ${errorMessage}`);
      throw error;
    }
  };

  const columns = [
    { label: "Identity", name: "displayName" },
    { label: "Address", name: "identityAddress", width: "350px" },
    { label: "KYC ID Account #", name: "kyc_id" },
    { label: "Flagged?", name: "flagged_account" },
    { label: "Claims", name: "claims" },
  ];
  const pendingColumns = [
    { label: "Identity", name: "displayName" },
    { label: "Address", name: "identityAddress", width: "350px" },
    { label: "KYC ID Account #", name: "kyc_id" },
    { label: "Recommended Compliance Rules", name: "recommended_compliance_rules" },
    { label: "Flagged?", name: "flagged_account" },
    { label: "Type", name: "type" },
    { label: "Status", name: "status" },
  ];

  const actions = [
    { label: "Edit Rules", name: NomyxAction.EditClaims },
    { label: "View", name: NomyxAction.ViewIdentity },
    { label: "Request for Investment", name: NomyxAction.RequestInvestment }, // New action
    {
      label: "Remove",
      name: NomyxAction.RemoveIdentity,
      confirmation: "Are you sure you want to remove this Identity?",
    },
  ];
  const pendingActions = [
    { label: "Approve", name: NomyxAction.CreatePendingIdentity },
    { label: "View", name: NomyxAction.ViewPendingIdentity },
    {
      label: "Deny",
      name: NomyxAction.RemoveUser,
      confirmation: "Are you sure you want to deny this pending Identity?",
    },
  ];
  const claimsActions = [
    { label: "Add Rules", name: NomyxAction.AddClaims },
    { label: "View", name: NomyxAction.ViewIdentity },
    {
      label: "Remove",
      name: NomyxAction.RemoveIdentity,
      confirmation: "Are you sure you want to remove this Identity?",
    },
  ];
  const globalActions = [{ label: "Create identity", name: NomyxAction.CreateIdentity }];

  const search = true;

  const handleAction = async (event, action, record) => {
    try {
      switch (action) {
        case NomyxAction.CreateIdentity:
          navigate("/identities/create");
          break;
        case NomyxAction.ViewIdentity:
          navigate("/identities/" + record.id);
          break;
        case NomyxAction.ViewPendingIdentity:
          navigate("/identities/pending/" + record.id);
          break;
        case NomyxAction.EditClaims:
          navigate("/identities/" + record.id + "/edit");
          break;
        case NomyxAction.AddClaims:
          navigate("/identities/" + record.id + "/edit");
          break;
        case NomyxAction.RemoveIdentity:
          handleRemoveIdentity(event, action, record);
          break;
        case NomyxAction.RequestInvestment: // Handle new action
          setSelectedIdentityForInvestment(record);
          setInvestmentModalVisible(true);
          break;
        case NomyxAction.CreatePendingIdentity:
          const { displayName, kyc_id, identityAddress } = record;
          navigate(`/identities/create?displayName=${displayName}&walletAddress=${identityAddress}&accountNumber=${kyc_id}`);
          break;
        case NomyxAction.RemoveUser:
          await handleRemoveUser(record);
          break;
        default:
          console.log("Action not handled: ", action);
          break;
      }
    } catch (error) {
      console.error("Error in handleAction:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(`Action failed: ${errorMessage}`);
    }
  };

  return (
    <>
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="Identities" key="Identities">
          <ObjectList
            title="Identities"
            description="Identities represent individuals that can be related to Compliance Rules"
            columns={columns}
            actions={actions}
            globalActions={globalActions}
            search={search}
            data={identities}
            pageSize={10}
            onAction={handleAction}
            onGlobalAction={handleAction}
          />
        </TabPane>
        <TabPane tab="Pending" key="Pending">
          <ObjectList
            title="Pending"
            description="Identities that have yet to be approved or denied"
            columns={pendingColumns}
            actions={pendingActions}
            globalActions={globalActions}
            search={search}
            data={pendingIdentities}
            pageSize={10}
            onAction={handleAction}
            onGlobalAction={handleAction}
          />
        </TabPane>
        <TabPane tab="Add Rules" key="Claims">
          <ObjectList
            title="Add Rules"
            description="Identies that have yet to be related to Compliance Rules"
            columns={columns}
            actions={claimsActions}
            globalActions={globalActions}
            search={search}
            data={identities}
            pageSize={10}
            onAction={handleAction}
            onGlobalAction={handleAction}
          />
        </TabPane>
      </Tabs>

      {/* Investment Request Modal */}
      <InvestmentRequestModal
        visible={investmentModalVisible}
        onClose={() => {
          setInvestmentModalVisible(false);
          setSelectedIdentityForInvestment(null);
        }}
        selectedIdentity={selectedIdentityForInvestment}
        tokenProjects={tokenProjects}
        onSubmit={handleInvestmentRequestSubmit}
      />
    </>
  );
};

export default IdentitiesPage;
