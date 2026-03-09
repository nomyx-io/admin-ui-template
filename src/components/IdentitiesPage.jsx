import { useState, useEffect, useCallback, useContext } from "react";

import { EditOutlined, EyeOutlined, DeleteOutlined, CheckOutlined, MailOutlined, CloseOutlined, PlusOutlined, LinkOutlined } from "@ant-design/icons";
import { Tabs, Modal, Form, Input } from "antd";
import Parse from "parse";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

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
  const [deniedIdentities, setDeniedIdentities] = useState([]);
  const [removedIdentities, setRemovedIdentities] = useState([]);
  const [activeTab, setActiveTab] = useState("Identities");
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingFilter, setPendingFilter] = useState("all");
  const [pagination, setPagination] = useState({
    identities: { page: 1, limit: 10, totalCount: 0, hasMore: false },
    claims: { page: 1, limit: 10, totalCount: 0, hasMore: false },
    pending: { page: 1, limit: 10, totalCount: 0, hasMore: false },
    denied: { page: 1, limit: 10, totalCount: 0, hasMore: false },
    removed: { page: 1, limit: 10, totalCount: 0, hasMore: false },
  });
  const [loading, setLoading] = useState({
    identities: false,
    claims: false,
    pending: false,
    denied: false,
    removed: false,
  });
  const [isAssociateModalVisible, setIsAssociateModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [associateForm] = Form.useForm();
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getErrorMessage = (error) => {
    if (typeof error === "string") return error;
    if (error?.reason) return error.reason;
    if (error?.message) return error.message;
    if (error?.toString) return error.toString();
    return "An unknown error occurred";
  };

  const getTabMeta = (tab) => {
    switch (tab) {
      case "Pending":
        return { key: "pending", status: "pending" };
      case "Denied":
        return { key: "denied", status: "denied" };
      case "Removed":
        return { key: "removed", status: "removed" };
      case "Claims":
        return { key: "claims", status: null };
      default:
        return { key: "identities", status: null };
    }
  };

  const templateTypeMap = {
    [process.env.REACT_APP_PERSONA_KYC_TEMPLATEID]: "KYC",
    [process.env.REACT_APP_PERSONA_KYB_TEMPLATEID]: "KYB",
    [process.env.REACT_APP_PERSONA_ACCREDITED_INVESTOR_TEMPLATEID]: "Accredited Investor",
    [process.env.REACT_APP_PERSONA_QUALIFIED_INVESTOR_TEMPLATEID]: "Qualified Investor",
    [process.env.REACT_APP_PERSONA_ACCREDITED_BUSINESS_TEMPLATEID]: "Accredited Business",
  };

  const mapPendingUser = (user) => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const personaData = user.personaVerificationData ? JSON.parse(user.personaVerificationData) : {};
    const identityType = templateTypeMap[user.templateId] || "";
    const name = personaData?.data?.attributes?.name || "";
    const status = name.split(".")[1]?.toUpperCase()?.replace(/-/g, " ") || "";

    return {
      id: user.objectId,
      displayName: `${firstName} ${lastName}`.trim(),
      email: user.username || user.email || "",
      identityAddress: user.walletAddress || "",
      kyc_id: user.personaReferenceId || "",
      pepMatched: user.pepMatched || false,
      watchlistMatched: user.watchlistMatched || false,
      type: identityType,
      status,
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
  };

  // ─── Data Fetching ────────────────────────────────────────────────────────────

  const fetchData = useCallback(
    async (tab, page = 1, search = "", filter = "all") => {
      const { key, status } = getTabMeta(tab);
      setLoading((prev) => ({ ...prev, [key]: true }));

      try {
        let fetchedIdentities = [];
        let paginationData = null;

        if (tab === "Identities") {
          const result = await Parse.Cloud.run("getActiveIdentities", {
            page,
            limit: pagination.identities.limit,
            withoutClaims: false,
            searchTerm: search,
          });

          if (result?.data) {
            fetchedIdentities = result.data.map((identity) => {
              const identityObj = {
                claims: identity.claims || "",
                displayName: identity.displayName || "",
                email: identity.email || "",
                kyc_id: identity.kyc_id || "",
                identityAddress: identity.identityAddress || "",
                id: identity.id || "",
                pepMatched: identity.pepMatched || false,
                watchlistMatched: identity.watchlistMatched || false,
              };

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
            identities: { ...prev.identities, ...paginationData, page },
          }));
        } else if (tab === "Claims") {
          const result = await Parse.Cloud.run("getActiveIdentities", {
            page,
            limit: pagination.claims.limit,
            withoutClaims: true,
            searchTerm: search,
          });

          if (result?.data) {
            fetchedIdentities = result.data.map((identity) => ({
              claims: identity.claims || "",
              displayName: identity.displayName || "",
              email: identity.email || "",
              kyc_id: identity.kyc_id || "",
              identityAddress: identity.identityAddress || "",
              id: identity.id || "",
              pepMatched: identity.pepMatched || false,
              watchlistMatched: identity.watchlistMatched || false,
            }));
            paginationData = result.pagination;
          }

          setClaimsIdentities(fetchedIdentities);
          setPagination((prev) => ({
            ...prev,
            claims: { ...prev.claims, ...paginationData, page },
          }));
        } else if (tab === "Pending" || tab === "Denied" || tab === "Removed") {
          const result = await Parse.Cloud.run("getPendingIdentities", {
            page,
            limit: pagination[key].limit,
            searchTerm: search,
            filter: tab === "Pending" ? filter : "all",
            status,
          });

          if (result?.data) {
            fetchedIdentities = result.data.map(mapPendingUser);
            paginationData = result.pagination;
          }

          if (tab === "Pending") {
            setPendingIdentities(fetchedIdentities);
            setPagination((prev) => ({
              ...prev,
              pending: { ...prev.pending, ...paginationData, page },
            }));
          } else if (tab === "Denied") {
            setDeniedIdentities(fetchedIdentities);
            setPagination((prev) => ({
              ...prev,
              denied: { ...prev.denied, ...paginationData, page },
            }));
          } else {
            setRemovedIdentities(fetchedIdentities);
            setPagination((prev) => ({
              ...prev,
              removed: { ...prev.removed, ...paginationData, page },
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error(`Failed to fetch data: ${getErrorMessage(error)}`);
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [pagination.identities.limit, pagination.claims.limit, pagination.pending.limit, pagination.denied.limit, pagination.removed.limit]
  );

  useEffect(() => {
    const { key } = getTabMeta(activeTab);

    setPagination((prev) => ({
      ...prev,
      [key]: { ...prev[key], page: 1 },
    }));

    if (activeTab !== "Pending") {
      setSearchTerm("");
      fetchData(activeTab, 1, "");
    } else {
      setPendingFilter("all");
      fetchData(activeTab, 1, "", "all");
    }
  }, [activeTab, refreshTrigger]);

  // ─── Event Handlers ───────────────────────────────────────────────────────────

  const removeFromLocalState = (record) => {
    const { id } = record;
    setIdentities((prev) => prev.filter((item) => item.id !== id));
    setClaimsIdentities((prev) => prev.filter((item) => item.id !== id));
    setPendingIdentities((prev) => prev.filter((item) => item.id !== id));
    setDeniedIdentities((prev) => prev.filter((item) => item.id !== id));
    setRemovedIdentities((prev) => prev.filter((item) => item.id !== id));
  };

  const handleTabChange = (key) => setActiveTab(key);

  const handlePageChange = (newPage) => {
    const { key } = getTabMeta(activeTab);
    setPagination((prev) => ({ ...prev, [key]: { ...prev[key], page: newPage } }));
    fetchData(activeTab, newPage, searchTerm);
  };

  const handleSearch = (newSearchTerm) => {
    const { key } = getTabMeta(activeTab);
    setPagination((prev) => ({ ...prev, [key]: { ...prev[key], page: 1 } }));
    setSearchTerm(newSearchTerm);
    fetchData(activeTab, 1, newSearchTerm);
  };

  const handlePendingFilterChange = (searchTerm, filter, page = 1) => {
    setPagination((prev) => ({ ...prev, pending: { ...prev.pending, page } }));
    setPendingFilter(filter);
    fetchData("Pending", page, searchTerm, filter);
  };

  const handleRemoveUser = async (record) => {
    const { displayName, identityAddress } = record;
    removeFromLocalState(record);
    toast
      .promise(
        async () => {
          const deleted = await service.softRemoveUser(identityAddress);
          return deleted;
        },
        {
          pending: `Denying ${displayName}...`,
          success: (deleted) => {
            if (deleted) {
              return `${displayName} has been successfully denied.`;
            } else {
              throw new Error(`${displayName} couldn't be denied.`);
            }
          },
          error: {
            render({ data }) {
              return `${displayName} couldn't be denied: ${getErrorMessage(data)}`;
            },
          },
        }
      )
      .then(() => setRefreshTrigger((prev) => !prev))
      .catch((error) => console.error("Error in handleRemoveUser:", error));
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
            return `Failed to send verification email: ${getErrorMessage(data)}`;
          },
        },
      }
    );
  };

  const handleRemoveIdentity = async (event, action, record) => {
    if (walletPreference === WalletPreference.MANAGED) {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const identities = [record.identityAddress];
      removeFromLocalState(record);
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
                  return <div>{getErrorMessage(data) || `An error occurred while removing ${record?.displayName}`}</div>;
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
          removeFromLocalState(record);
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
              return <div>{getErrorMessage(data) || `An error occurred while removing ${record?.displayName}`}</div>;
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
            personaInquiryId,
          });
          return result;
        },
        {
          pending: `Associating Persona Inquiry ID for ${selectedRecord.displayName}...`,
          success: `Successfully associated Persona Inquiry ID for ${selectedRecord.displayName}`,
          error: {
            render({ data }) {
              return `Failed to associate Persona Inquiry ID: ${getErrorMessage(data)}`;
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
        case NomyxAction.CreatePendingIdentity:
          const { displayName, kyc_id, identityAddress } = record;
          navigate(
            `/identities/create?displayName=${encodeURIComponent(displayName)}&walletAddress=${encodeURIComponent(identityAddress)}&accountNumber=${encodeURIComponent(kyc_id)}`
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
        default:
          console.log("Action not handled: ", action);
          break;
      }
    } catch (error) {
      console.error("Error in handleAction:", error);
      toast.error(`Action failed: ${getErrorMessage(error)}`);
    }
  };

  // ─── Current Tab Data ─────────────────────────────────────────────────────────

  const getCurrentData = () => {
    switch (activeTab) {
      case "Identities":
        return identities;
      case "Claims":
        return claimsIdentities;
      case "Pending":
        return pendingIdentities;
      case "Denied":
        return deniedIdentities;
      case "Removed":
        return removedIdentities;
      default:
        return [];
    }
  };

  const getCurrentPagination = () => {
    switch (activeTab) {
      case "Identities":
        return pagination.identities;
      case "Claims":
        return pagination.claims;
      case "Pending":
        return pagination.pending;
      case "Denied":
        return pagination.denied;
      case "Removed":
        return pagination.removed;
      default:
        return { page: 1, limit: 10, totalCount: 0, hasMore: false };
    }
  };

  // ─── Column Definitions ───────────────────────────────────────────────────────

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

  // ─── Action Definitions ───────────────────────────────────────────────────────

  const actions = [
    { label: "Edit Rules", name: NomyxAction.EditClaims, icon: <EditOutlined /> },
    { label: "View", name: NomyxAction.ViewIdentity, icon: <EyeOutlined /> },
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
      label: "Deny",
      name: NomyxAction.RemoveUser,
      icon: <CloseOutlined />,
      confirmation: "Are you sure you want to deny this pending Identity?",
    },
  ];

  const deniedActions = [
    { label: "Approve", name: NomyxAction.CreatePendingIdentity, icon: <CheckOutlined /> },
    { label: "View", name: NomyxAction.ViewPendingIdentity, icon: <EyeOutlined /> },
    { label: "Associate", name: NomyxAction.AssociateInquiry, icon: <LinkOutlined /> },
    { label: "Send Verification", name: NomyxAction.SendVerificationEmail, icon: <MailOutlined /> },
  ];

  const removedActions = [
    { label: "Re-approve", name: NomyxAction.CreatePendingIdentity, icon: <CheckOutlined /> },
    { label: "View", name: NomyxAction.ViewPendingIdentity, icon: <EyeOutlined /> },
    { label: "Associate", name: NomyxAction.AssociateInquiry, icon: <LinkOutlined /> },
    { label: "Send Verification", name: NomyxAction.SendVerificationEmail, icon: <MailOutlined /> },
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

  // ─── Render ───────────────────────────────────────────────────────────────────

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

        <TabPane tab="Denied" key="Denied">
          <PendingIdentitiesObjectList
            title="Denied"
            description="Identities that have been denied"
            columns={pendingColumns}
            actions={deniedActions}
            globalActions={globalActions}
            data={getCurrentData()}
            pageSize={10}
            onAction={handleAction}
            onGlobalAction={handleAction}
            loading={loading.denied}
            hasMore={pagination.denied.hasMore}
            totalCount={pagination.denied.totalCount}
            currentPage={pagination.denied.page}
            onPageChange={handlePageChange}
            showFilterDropdown={false}
          />
        </TabPane>

        <TabPane tab="Removed" key="Removed">
          <PendingIdentitiesObjectList
            title="Removed"
            description="Identities that have been removed"
            columns={pendingColumns}
            actions={removedActions}
            globalActions={globalActions}
            data={getCurrentData()}
            pageSize={10}
            onAction={handleAction}
            onGlobalAction={handleAction}
            loading={loading.removed}
            hasMore={pagination.removed.hasMore}
            totalCount={pagination.removed.totalCount}
            currentPage={pagination.removed.page}
            onPageChange={handlePageChange}
            showFilterDropdown={false}
          />
        </TabPane>

        <TabPane tab="Add Rules" key="Claims">
          <ObjectList
            title="Add Rules"
            description="Identities that have yet to be related to Compliance Rules"
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
          <Form.Item name="personaInquiryId" label="Persona Inquiry ID" rules={[{ required: true, message: "Please enter the Persona Inquiry ID" }]}>
            <Input placeholder="Enter Persona Inquiry ID" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default IdentitiesPage;
