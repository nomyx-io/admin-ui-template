import { useState, useEffect, useCallback } from "react";

import { Tabs } from "antd";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";
import { NomyxAction } from "../utils/Constants";

const { TabPane } = Tabs;

const IdentitiesPage = ({ service }) => {
  const navigate = useNavigate();
  const [identities, setIdentities] = useState([]);
  const [pendingIdentities, setPendingIdentities] = useState([]);
  const [activeTab, setActiveTab] = useState("Identities");
  const [refreshTrigger, setRefreshTrigger] = useState(false);

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
                identidyObj.claims = claimsArray.join(", "); // Convert claims array to comma-separated string
                identidyObj.displayName = identity.attributes.displayName || "";
                identidyObj.kyc_id = identity.attributes.accountNumber || "";
                identidyObj.identityAddress = identity.attributes.address || "";
                identidyObj.id = identity.id;
              } else {
                // Default empty values if attributes are missing
                identidyObj.claims = "";
                identidyObj.displayName = "";
                identidyObj.kyc_id = "";
                identidyObj.identityAddress = "";
                identidyObj.id = "";
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
                type: identityType || "", // Type of identity
                status: status || "", // Status of identity
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
      }
    },
    [service]
  );

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, service, refreshTrigger, fetchData]);
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
          error: `${displayName} couldn't be removed. Please try again later.`,
        }
      )
      .then(() => {
        fetchData(activeTab); // Trigger fetchData after removal is complete
      });
  };

  const handleRemoveIdentity = async (event, action, record) => {
    toast.promise(
      async () => {
        const identities = [record.identityAddress];

        for (const identity of identities) {
          // Step 1: Call removeIdentity
          await service.removeIdentity(identity);
          // Step 2: Call unregisterIdentity
          await service.unregisterIdentity(identity);
        }

        // After successful removal, trigger a refresh of the component
        setRefreshTrigger((prev) => !prev); // This needs to be tested upon updated removal event contract redeployment
      },
      {
        pending: `Removing ${record?.displayName}...`,
        success: `Successfully removed ${record?.displayName}`,
        error: {
          render({ data }) {
            return <div>{data?.reason || `An error occurred while removing ${record?.displayName}`}</div>;
          },
        },
      }
    );
  };

  const columns = [
    { label: "Identity", name: "displayName" },
    { label: "Address", name: "identityAddress", width: "350px" },
    { label: "KYC ID Account #", name: "kyc_id" },
    { label: "Claims", name: "claims" },
  ];
  const pendingColumns = [
    { label: "Identity", name: "displayName" },
    { label: "Address", name: "identityAddress", width: "350px" },
    { label: "KYC ID Account #", name: "kyc_id" },
    { label: "Type", name: "type" },
    { label: "Status", name: "status" },
  ];

  const actions = [
    { label: "Edit Claims", name: NomyxAction.EditClaims },
    { label: "View", name: NomyxAction.ViewIdentity },
    {
      label: "Remove",
      name: NomyxAction.RemoveIdentity,
      confirmation: "Are you sure you want to remove this Identity?",
    },
  ];
  const pendingActions = [
    { label: "Approve", name: NomyxAction.CreatePendingIdentity },
    {
      label: "Deny",
      name: NomyxAction.RemoveUser,
      confirmation: "Are you sure you want to deny this pending Identity?",
    },
  ];
  const claimsActions = [
    { label: "Add Claims", name: NomyxAction.AddClaims },
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
    switch (action) {
      case NomyxAction.CreateIdentity:
        navigate("/identities/create");
        break;
      case NomyxAction.ViewIdentity:
        navigate("/identities/" + record.id);
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
  };

  return (
    <>
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="Identities" key="Identities">
          <ObjectList
            title="Identities"
            description="Identities represent individuals that can be related to Claim Topics"
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
        <TabPane tab="Add Claims" key="Claims">
          <ObjectList
            title="Add Claims"
            description="Identies that have yet to be related to Claim Topics"
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
    </>
  );
};

export default IdentitiesPage;
