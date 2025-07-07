import { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import { Spin } from "antd";

import ObjectList from "./ObjectList";
import { NomyxAction } from "../utils/Constants";

const ClaimTopicsPage = ({ service }) => {
  const navigate = useNavigate();
  const [claimTopics, setClaimTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    { label: "Id", name: "attributes.topic" },
    { label: "Compliance Rule", name: "attributes.displayName", width: "95%" },
  ];

  const actions = [{ label: "View", name: NomyxAction.ViewClaimTopic }];

  const globalActions = [{ label: "Create Compliance Rule", name: NomyxAction.CreateClaimTopic }];

  const search = true;

  const handleAction = async (event, action, record) => {
    switch (action) {
      case NomyxAction.CreateClaimTopic:
        navigate("/topics/create");
        break;
      case NomyxAction.ViewClaimTopic:
        let id = record.id;
        navigate("/topics/" + id);
        break;
      default:
        console.log("Unknown action: " + action);
    }
  };

  useEffect(() => {
    (async function () {
      if (!service || !service.getClaimTopics) {
        console.log("[ClaimTopicsPage] Service not ready yet, waiting...");
        return; // Keep loading true
      }

      try {
        const result = await service.getClaimTopics();
        setClaimTopics(result);
      } catch (error) {
        console.error("[ClaimTopicsPage] Error fetching claim topics:", error);
        setClaimTopics([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    })();
  }, [service]);

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
      data={claimTopics}
      pageSize={10}
      onAction={handleAction}
      onGlobalAction={handleAction}
    />
  );
};

export default ClaimTopicsPage;
