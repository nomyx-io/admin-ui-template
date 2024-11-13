import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NomyxAction } from "../utils/Constants";
import ObjectList from "./ObjectList";

const ClaimTopicsPage = ({ service }) => {
  const navigate = useNavigate();
  const [claimTopics, setClaimTopics] = useState([]);

  const columns = [
    { label: "Id", name: "attributes.topic" },
    { label: "Claim Topic", name: "attributes.displayName", width: "95%" },
  ];

  const actions = [{ label: "View", name: NomyxAction.ViewClaimTopic }];

  const globalActions = [{ label: "Create Claim Topic", name: NomyxAction.CreateClaimTopic }];

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
    }
  };

  useEffect(() => {
    (async function () {
      const result = await service.getClaimTopics();
      setClaimTopics(result);
    })();
  }, [service]);

  return (
    <ObjectList
      title="Claim Topics"
      description="Claim Topics describe the types of Claims that can be created for any Identity"
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
