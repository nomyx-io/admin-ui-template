import { useState, useEffect, useCallback, useContext } from "react";

import {
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  CheckOutlined,
  MailOutlined,
  CloseOutlined,
  PlusOutlined,
  LinkOutlined,
  ReloadOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { Tabs, Modal, Form, Input } from "antd";
import Parse from "parse";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import InvestmentRequestModal from "./InvestmentRequestModal";
import ObjectList from "./ObjectList";
import PendingIdentitiesObjectList from "./PendingIdentitiesObjectList";
import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { NomyxAction } from "../utils/Constants";
import { WalletPreference } from "../utils/Constants";

const { TabPane } = Tabs;

const IdentitiesPage = ({ service }) => {
  const navigate = useNavigate();
  const [identities, setIdentities] = useState([]);
  const [claimsIdentities, setClaimsIdentities] = useState([]);
  const [pendingIdentities, setPendingIdentities] = useState([]);
  const [activeTab, setActiveTab] = useState("Identities");
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingFilter, setPendingFilter] = useState("all");
  const [pagination, setPagination] = useState({
    identities: { page: 1, limit: 10, totalCount: 0, hasMore: false },
    claims: { page: 1, limit: 10, totalCount: 0, hasMore: false },
    pending: { page: 1, limit: 10, totalCount: 0, hasMore: false },
  });
  const [loading, setLoading] = useState({
    identities: false,
    claims: false,
    pending: false,
  });
  const [isAssociateModalVisible, setIsAssociateModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [associateForm] = Form.useForm();
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

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
    async (tab, page = 1, search = "", filter = "all") => {
      const loadingKey = tab === "Pending" ? "pending" : tab === "Claims" ? "claims" : "identities";
      const paginationType = tab === "Pending" ? "pending" : tab === "Claims" ? "claims" : "identities";

      // Set loading state for specific tab
      setLoading((prev) => ({ ...prev, [loadingKey]: true }));

      try {
        let fetchedIdentities = [];
        let paginationData = null;

        if (tab === "Identities") {
          // Call paginated cloud function for active identities
          const result = await Parse.Cloud.run("getActiveIdentities", {
            page,
            limit: pagination.identities.limit,
            withoutClaims: false, // Get all identities
            searchTerm: search,
          });

          if (result && result.data) {
            fetchedIdentities = result.data.map((identity) => {
              let identityObj = {
                claims: identity.claims || "",
                displayName: identity.displayName || "",
                email: identity.email || "",
                kyc_id: identity.kyc_id || "",
                identityAddress: identity.identityAddress || "",
                id: identity.id || "",
                pepMatched: identity.pepMatched || false,
                watchlistMatched: identity.watchlistMatched || false,
              };

              // Re-sort claims numerically on the client side
              if (identityObj.claims) {
                const claimsArray = identityObj.claims.split(", ");
                const sortedClaims = claimsArray
                  .map((claim) => parseInt(claim, 10))
                  .filter((claim) => !isNaN(claim))
                  .sort((a, b) => a - b)
                  .map((claim) => claim.toString());

                identityObj.claims = sortedClaims.join(", ");
              }

              return identityObj;
            });

            paginationData = result.pagination;
          }

          setIdentities(fetchedIdentities);
          setPagination((prev) => ({
            ...prev,
            identities: {
              ...prev.identities,
              ...paginationData,
              page: page,
            },
          }));
        } else if (tab === "Claims") {
          // Call paginated cloud function for identities without claims
          const result = await Parse.Cloud.run("getActiveIdentities", {
            page,
            limit: pagination.claims.limit,
            withoutClaims: true, // Get only identities without claims
            searchTerm: search,
          });

          if (result && result.data) {
            fetchedIdentities = result.data.map((identity) => {
              let identityObj = {
                claims: identity.claims || "",
                displayName: identity.displayName || "",
                email: identity.email || "",
                kyc_id: identity.kyc_id || "",
                identityAddress: identity.identityAddress || "",
                id: identity.id || "",
                pepMatched: identity.pepMatched || false,
                watchlistMatched: identity.watchlistMatched || false,
              };

              return identityObj;
            });

            paginationData = result.pagination;
          }

          setClaimsIdentities(fetchedIdentities);
          setPagination((prev) => ({
            ...prev,
            claims: {
              ...prev.claims,
              ...paginationData,
              page: page,
            },
          }));
        } else if (tab === "Pending") {
          // Call paginated cloud function for pending identities with filter
          const result = await Parse.Cloud.run("getPendingIdentities", {
            page,
            limit: pagination.pending.limit,
            searchTerm: search,
            filter: filter, // Add filter parameter
          });

          if (result && result.data) {
            fetchedIdentities = result.data.map((user) => {
              const firstName = user.firstName || "";
              const lastName = user.lastName || "";
              const personaData = user.personaVerificationData ? JSON.parse(user.personaVerificationData) : {};

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
                id: user.objectId,
                displayName: `${firstName} ${lastName}`.trim(),
                email: user.username || user.email || "",
                identityAddress: user.walletAddress || "",
                kyc_id: user.personaReferenceId || "",
                pepMatched: user.pepMatched || false,
                watchlistMatched: user.watchlistMatched || false,
                type: identityType || "",
                status: status || "",
                personaVerified: user.personaVerified,
                attributes: {
                  firstName,
                  lastName,
                  username: user.username,
                  walletAddress: user.walletAddress,
                  personaReferenceId: user.personaReferenceId,
                  personaVerificationData: user.personaVerificationData,
                  pepMatched: user.pepMatched,
                  watchlistMatched: user.watchlistMatched,
                },
              };
            });

            paginationData = result.pagination;
          }

          setPendingIdentities(fetchedIdentities);
          setPagination((prev) => ({
            ...prev,
            pending: {
              ...prev.pending,
              ...paginationData,
              page: page,
            },
          }));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        const errorMessage = getErrorMessage(error);
        toast.error(`Failed to fetch data: ${errorMessage}`);
      } finally {
        // Clear loading state for specific tab
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [pagination.identities.limit, pagination.claims.limit, pagination.pending.limit]
  );

  useEffect(() => {
    // Reset pagination and search when tab changes or refresh is triggered
    const paginationType = activeTab === "Pending" ? "pending" : activeTab === "Claims" ? "claims" : "identities";

    setPagination((prev) => ({
      ...prev,
      [paginationType]: {
        ...prev[paginationType],
        page: 1,
      },
    }));

    if (activeTab !== "Pending") {
      setSearchTerm(""); // Clear search when switching to non-pending tabs
      fetchData(activeTab, 1, "");
    } else {
      // For pending tab, load "All Pending Users" by default
      setPendingFilter("all");
      fetchData(activeTab, 1, "", "all");
    }
  }, [activeTab, refreshTrigger]);

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const handlePageChange = (newPage) => {
    const paginationType = activeTab === "Pending" ? "pending" : activeTab === "Claims" ? "claims" : "identities";

    setPagination((prev) => ({
      ...prev,
      [paginationType]: {
        ...prev[paginationType],
        page: newPage,
      },
    }));

    fetchData(activeTab, newPage, searchTerm);
  };

  const handleSearch = (newSearchTerm) => {
    const paginationType = activeTab === "Pending" ? "pending" : activeTab === "Claims" ? "claims" : "identities";

    // Reset to page 1 when searching
    setPagination((prev) => ({
      ...prev,
      [paginationType]: {
        ...prev[paginationType],
        page: 1,
      },
    }));

    setSearchTerm(newSearchTerm);
    fetchData(activeTab, 1, newSearchTerm);
  };

  // New handler for pending identities filter change
  const handlePendingFilterChange = (searchTerm, filter, page = 1) => {
    setPagination((prev) => ({
      ...prev,
      pending: {
        ...prev.pending,
        page: page,
      },
    }));

    setPendingFilter(filter);
    fetchData("Pending", page, searchTerm, filter);
  };

  const handleRemoveUser = async (record) => {
    const { displayName, identityAddress } = record;
    toast
      .promise(
        async () => {
          const deleted = await service.softRemoveUser(identityAddress);
          return deleted;
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
        setRefreshTrigger((prev) => !prev);
      })
      .catch((error) => {
        console.error("Error in handleRemoveUser:", error);
      });
  };

  const handleSendVerificationEmail = async (record) => {
    const { email, displayName } = record;

    if (!email) {
      toast.error("Email address is missing for this user");
      return;
    }

    toast.promise(
      async () => {
        try {
          const result = await Parse.Cloud.run("sendVerificationEmail", { email });
          return result;
        } catch (error) {
          console.error("Error sending verification email:", error);
          throw error;
        }
      },
      {
        pending: `Sending verification email to ${displayName || email}...`,
        success: `Verification email sent successfully to ${email}`,
        error: {
          render({ data }) {
            const errorMessage = getErrorMessage(data);
            return `Failed to send verification email: ${errorMessage}`;
          },
        },
      }
    );
  };

  // ─── Reset Persona Verification ─────────────────────────────────────────
  const handleResetPersonaVerification = async (record) => {
    const { id, displayName } = record;

    toast
      .promise(
        async () => {
          const result = await Parse.Cloud.run("resetPersonaVerification", {
            userId: id,
          });
          return result;
        },
        {
          pending: `Resetting Persona verification for ${displayName}...`,
          success: `Persona verification reset for ${displayName}.`,
          error: {
            render({ data }) {
              return `Failed to reset Persona verification: ${getErrorMessage(data)}`;
            },
          },
        }
      )
      .then(() => setRefreshTrigger((prev) => !prev))
      .catch((error) => console.error("Error in handleResetPersonaVerification:", error));
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
                const { initiateResponse, error: removeInitError } = await DfnsService.initiateRemoveIdentity(identity, user.walletId, dfnsToken);
                if (removeInitError) throw new Error(removeInitError);

                const { completeResponse, error: removeCompleteError } = await DfnsService.completeRemoveIdentity(
                  user.walletId,
                  dfnsToken,
                  initiateResponse.challenge,
                  initiateResponse.requestBody
                );
                if (removeCompleteError) throw new Error(removeCompleteError);

                await delay(2000);

                const { initiateResponse: unregisterInitResponse, error: unregisterInitError } = await DfnsService.initiateUnregisterIdentity(
                  identity,
                  user.walletId,
                  dfnsToken
                );
                if (unregisterInitError) throw new Error(unregisterInitError);

                const { completeResponse: unregisterCompleteResponse, error: unregisterCompleteError } = await DfnsService.completeUnregisterIdentity(
                  user.walletId,
                  dfnsToken,
                  unregisterInitResponse.challenge,
                  unregisterInitResponse.requestBody
                );
                if (unregisterCompleteError) throw new Error(unregisterCompleteError);

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
              await service.removeIdentity(identity);
              await service.unregisterIdentity(identity);
            }

            setRefreshTrigger((prev) => !prev);
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

  const handleAssociateInquiry = (record) => {
    setSelectedRecord(record);
    setIsAssociateModalVisible(true);
  };

  const handleAssociateModalCancel = () => {
    setIsAssociateModalVisible(false);
    setSelectedRecord(null);
    associateForm.resetFields();
  };

  const handleAssociateModalOk = async () => {
    try {
      const values = await associateForm.validateFields();
      const { personaInquiryId } = values;

      await toast.promise(
        async () => {
          const result = await Parse.Cloud.run("associatePersonaInquiry", {
            userId: selectedRecord.id,
            personaInquiryId: personaInquiryId,
          });
          return result;
        },
        {
          pending: `Associating Persona Inquiry ID for ${selectedRecord.displayName}...`,
          success: `Successfully associated Persona Inquiry ID for ${selectedRecord.displayName}`,
          error: {
            render({ data }) {
              const errorMessage = getErrorMessage(data);
              return `Failed to associate Persona Inquiry ID: ${errorMessage}`;
            },
          },
        }
      );

      handleAssociateModalCancel();
      setRefreshTrigger((prev) => !prev);
    } catch (error) {
      console.error("Error in handleAssociateModalOk:", error);
    }
  };

  const columns = [
    { label: "Identity", name: "displayName" },
    { label: "Email", name: "email" },
    { label: "Address", name: "identityAddress", width: "350px" },
    { label: "KYC ID Account #", name: "kyc_id" },
    { label: "Flagged?", name: "flagged_account" },
    { label: "Claims", name: "claims" },
  ];
  const pendingColumns = [
    { label: "Identity", name: "displayName" },
    { label: "Email", name: "email" },
    { label: "Address", name: "identityAddress", width: "350px" },
    { label: "KYC ID Account #", name: "kyc_id" },
    { label: "Flagged?", name: "flagged_account" },
    { label: "Type", name: "type" },
    { label: "Status", name: "status" },
  ];

  const addRulesColumns = [
    { label: "Identity", name: "displayName" },
    { label: "Email", name: "email" },
    { label: "Address", name: "identityAddress", width: "350px" },
    { label: "KYC ID Account #", name: "kyc_id" },
    { label: "Flagged?", name: "flagged_account" },
  ];

  const actions = [
    { label: "Edit", name: NomyxAction.EditClaims, icon: <EditOutlined /> },
    { label: "View", name: NomyxAction.ViewIdentity, icon: <EyeOutlined /> },
    { label: "Request for Investment", name: NomyxAction.RequestInvestment, icon: <DollarOutlined /> },
    {
      label: "Remove",
      name: NomyxAction.RemoveIdentity,
      icon: <DeleteOutlined />,
      confirmation: "Are you sure you want to remove this Identity?",
    },
  ];
  const pendingActions = [
    { label: "Approve", name: NomyxAction.CreatePendingIdentity, icon: <CheckOutlined /> },
    { label: "View", name: NomyxAction.ViewPendingIdentity, icon: <EyeOutlined /> },
    { label: "Associate", name: NomyxAction.AssociateInquiry, icon: <LinkOutlined /> },
    { label: "Send Verification", name: NomyxAction.SendVerificationEmail, icon: <MailOutlined /> },
    {
      label: "Reset Persona",
      name: NomyxAction.ResetPersonaVerification,
      icon: <ReloadOutlined />,
      confirmation: "This will clear the user's current Persona verification and require them to re-verify their identity. Are you sure?",
    },
    {
      label: "Deny",
      name: NomyxAction.RemoveUser,
      icon: <CloseOutlined />,
      confirmation: "Are you sure you want to deny this pending Identity?",
    },
  ];
  const claimsActions = [
    { label: "Add Rules", name: NomyxAction.AddClaims, icon: <PlusOutlined /> },
    { label: "View", name: NomyxAction.ViewIdentity, icon: <EyeOutlined /> },
    {
      label: "Remove",
      name: NomyxAction.RemoveIdentity,
      icon: <DeleteOutlined />,
      confirmation: "Are you sure you want to remove this Identity?",
    },
  ];
  const globalActions = [{ label: "Create identity", name: NomyxAction.CreateIdentity, icon: <PlusOutlined /> }];

  const search = true;

  const handleAction = async (event, action, record) => {
    try {
      switch (action) {
        case NomyxAction.CreateIdentity:
          navigate("/identities/create");
          break;
        case NomyxAction.ViewIdentity:
          navigate("/identities/" + record.id + "?email=" + encodeURIComponent(record.email));
          break;
        case NomyxAction.ViewPendingIdentity:
          navigate("/identities/pending/" + record.id);
          break;
        case NomyxAction.EditClaims:
          navigate("/identities/" + record.id + "/edit?email=" + encodeURIComponent(record.email));
          break;
        case NomyxAction.AddClaims:
          navigate("/identities/" + record.id + "/edit?email=" + encodeURIComponent(record.email));
          break;
        case NomyxAction.RemoveIdentity:
          handleRemoveIdentity(event, action, record);
          break;
        case NomyxAction.RequestInvestment: // Handle new action
          setSelectedIdentityForInvestment(record);
          setInvestmentModalVisible(true);
          break;
        case NomyxAction.CreatePendingIdentity:
          const { displayName, kyc_id, identityAddress, id, email } = record;
          navigate(
            `/identities/create?displayName=${displayName}&walletAddress=${identityAddress}&accountNumber=${kyc_id}&userId=${id}&email=${encodeURIComponent(email)}`
          );
          break;
        case NomyxAction.AssociateInquiry:
          handleAssociateInquiry(record);
          break;
        case NomyxAction.SendVerificationEmail:
          await handleSendVerificationEmail(record);
          break;
        case NomyxAction.RemoveUser:
          await handleRemoveUser(record);
          break;
        case NomyxAction.ResetPersonaVerification:
          await handleResetPersonaVerification(record);
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

  // Get current data and pagination based on active tab
  const getCurrentData = () => {
    if (activeTab === "Identities") {
      return identities;
    } else if (activeTab === "Claims") {
      return claimsIdentities;
    } else if (activeTab === "Pending") {
      return pendingIdentities;
    }
    return [];
  };

  const getCurrentPagination = () => {
    if (activeTab === "Identities") {
      return pagination.identities;
    } else if (activeTab === "Claims") {
      return pagination.claims;
    } else if (activeTab === "Pending") {
      return pagination.pending;
    }
    return { page: 1, limit: 10, totalCount: 0, hasMore: false };
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
            data={getCurrentData()}
            pageSize={10}
            onAction={handleAction}
            onGlobalAction={handleAction}
            loading={loading.identities}
            hasMore={pagination.identities.hasMore}
            totalCount={pagination.identities.totalCount}
            useServerPagination={true}
            currentPage={pagination.identities.page}
            onPageChange={handlePageChange}
            searchTerm={searchTerm}
            onSearch={handleSearch}
          />
        </TabPane>
        <TabPane tab="Pending" key="Pending">
          <PendingIdentitiesObjectList
            title="Pending"
            description="Identities that have yet to be approved or denied"
            columns={pendingColumns}
            actions={pendingActions}
            globalActions={globalActions}
            data={getCurrentData()}
            pageSize={10}
            onAction={handleAction}
            onGlobalAction={handleAction}
            loading={loading.pending}
            hasMore={pagination.pending.hasMore}
            totalCount={pagination.pending.totalCount}
            currentPage={pagination.pending.page}
            onPageChange={handlePageChange}
            onFilterChange={handlePendingFilterChange}
          />
        </TabPane>
        <TabPane tab="Add Rules" key="Claims">
          <ObjectList
            title="Add Rules"
            description="Identies that have yet to be related to Compliance Rules"
            columns={addRulesColumns}
            actions={claimsActions}
            globalActions={globalActions}
            search={search}
            data={getCurrentData()}
            pageSize={10}
            onAction={handleAction}
            onGlobalAction={handleAction}
            loading={loading.claims}
            hasMore={pagination.claims.hasMore}
            totalCount={pagination.claims.totalCount}
            useServerPagination={true}
            currentPage={pagination.claims.page}
            onPageChange={handlePageChange}
            searchTerm={searchTerm}
            onSearch={handleSearch}
          />
        </TabPane>
      </Tabs>

      <Modal
        title="Associate Persona Inquiry ID"
        open={isAssociateModalVisible}
        onOk={handleAssociateModalOk}
        onCancel={handleAssociateModalCancel}
        okText="Associate"
        cancelText="Cancel"
      >
        <Form form={associateForm} layout="vertical" name="associateInquiryForm">
          <Form.Item
            name="personaInquiryId"
            label="Persona Inquiry ID"
            rules={[
              {
                required: true,
                message: "Please enter the Persona Inquiry ID",
              },
            ]}
          >
            <Input placeholder="Enter Persona Inquiry ID" />
          </Form.Item>
        </Form>
      </Modal>
      {/* Investment Request Modal */}
      <InvestmentRequestModal
        visible={investmentModalVisible}
        onClose={() => {
          setInvestmentModalVisible(false);
          setSelectedIdentityForInvestment(null);
        }}
        selectedIdentity={selectedIdentityForInvestment}
        tokenProjects={tokenProjects}
      />
    </>
  );
};

export default IdentitiesPage;
