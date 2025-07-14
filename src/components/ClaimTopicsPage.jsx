import { useNavigate } from "react-router-dom";
import { Spin } from "antd";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";
import { NomyxAction } from "../utils/Constants";
import useChainAwareData from "../hooks/useChainAwareData";

const ClaimTopicsPage = ({ service }) => {
  const navigate = useNavigate();

  // Use the chain-aware hook to fetch claim topics
  const {
    data: claimTopics,
    loading,
    error,
    currentChain,
    refetch,
  } = useChainAwareData(service, async (service) => {
    return await service.getClaimTopics();
  });

  const columns = [
    { label: "Id", name: "attributes.topic" },
    { label: "Compliance Rule", name: "attributes.displayName", width: "95%" },
  ];

  const actions = [
    { label: "View", name: NomyxAction.ViewClaimTopic },
    { label: "Update", name: NomyxAction.UpdateClaimTopic },
    {
      label: "Delete",
      name: NomyxAction.DeleteClaimTopic,
      confirmation: "Are you sure you want to delete this Compliance Rule?",
    },
  ];

  const globalActions = [{ label: "Create Compliance Rule", name: NomyxAction.CreateClaimTopic }];

  const search = true;

  const handleDeleteClaimTopic = async (topicId) => {
    try {
      await toast.promise(
        (async () => {
          await service.removeClaimTopic(topicId);
          // Refresh the data after deletion
          await refetch();
        })(),
        {
          pending: "Deleting Compliance Rule...",
          success: `Successfully deleted Compliance Rule ${topicId}`,
          error: {
            render({ data }) {
              return <div>{data?.message || `Failed to delete Compliance Rule ${topicId}`}</div>;
            },
          },
        }
      );
    } catch (error) {
      console.error("Error deleting claim topic:", error);
    }
  };

  const handleAction = async (event, action, record) => {
    switch (action) {
      case NomyxAction.CreateClaimTopic:
        navigate("/topics/create");
        break;
      case NomyxAction.ViewClaimTopic:
        let id = record.id;
        navigate("/topics/" + id);
        break;
      case NomyxAction.UpdateClaimTopic:
        navigate("/topics/" + record.id + "/edit");
        break;
      case NomyxAction.DeleteClaimTopic:
        handleDeleteClaimTopic(record.attributes?.topic);
        break;
      default:
        console.log("Unknown action: " + action);
    }
  };

  // Show loading spinner while service is initializing
  if (loading || !service) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Spin size="large" />
        <span className="ml-3">Loading compliance rules...</span>
      </div>
    );
  }

  return (
    <ObjectList
      title="Compliance Rules"
      description="Compliance Rules describe the types of Claims that can be created for any Identity"
      columns={columns}
      actions={actions}
      globalActions={globalActions}
      search={search}
      data={claimTopics || []}
      pageSize={10}
      onAction={handleAction}
      onGlobalAction={handleAction}
    />
  );
};

export default ClaimTopicsPage;
