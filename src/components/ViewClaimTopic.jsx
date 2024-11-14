import { useEffect, useState, useCallback } from "react";

import { Breadcrumb } from "antd";
import { Tabs } from "antd";
import moment from "moment";
import { Link, useNavigate, useParams } from "react-router-dom";

import ObjectList from "./ObjectList";

function ViewClaimTopic({ service }) {
  const navigate = useNavigate();
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [claimTopicDetails, setClaimTopicDetails] = useState(null);
  let { topicId } = useParams();

  const fetchData = useCallback(async () => {
    if (!service.getClaimTopicById) return;
    const claimTopicData = service.getClaimTopicById && (await service.getClaimTopicById(topicId));
    setClaimTopicDetails(claimTopicData);
    const topic = claimTopicData?.[0]?.attributes?.topic;
    const issuers = service.getTrustedIssuersForClaimTopics && (await service.getTrustedIssuersForClaimTopics(topic));
    setTrustedIssuers(issuers);
    const claims = service.getClaimsForClaimTopics && (await service.getClaimsForClaimTopics(topicId));
    setClaims(claims);
  }, [service, topicId]);

  useEffect(() => {
    fetchData();
  }, [service, fetchData]);

  const onChange = (key) => {
    // console.log(key);
  };

  const findTimestampOfProvidedTopic = (providedTopic, data) => {
    for (const item of data) {
      if (item.topic === providedTopic) {
        return item.timestamp;
      }
    }

    return null;
  };

  const trustedIssuerColumns = [
    {
      label: `${trustedIssuers?.length || 0} Members`,
      name: "id",
      render: (row) => (
        <div className="text-[#272b30]">
          <div className="text-base">{row?.attributes?.verifierName}</div>
          <div className="text-sm">{row?.attributes?.issuer}</div>
        </div>
      ),
    },
    {
      label: "Date",
      render: (row) => (
        <div>{moment(findTimestampOfProvidedTopic(claimTopicDetails?.[0]?.attributes?.topic, row?.attributes?.claimTopics)).format("DD/MM/YY")}</div>
      ),
    },
    {
      label: "Managed Claim Topics",
      name: "attributes?.claimTopics",
      render: (row) => (
        <div className="text-[#272b30]">
          <div className="text-base">{row?.attributes?.claimTopics.map((item) => item.topic).join(", ")}</div>
        </div>
      ),
    },
  ];

  const digitalIdsColumns = [
    {
      label: `${claims?.length || 0} Members`,
      name: "id",
      render: (row) => (
        <div className="text-[#272b30]">
          <div className="text-base">
            <button
              onClick={(event) => {
                event.preventDefault();
                navigate("/identities/" + row?.attributes?.identityObj.id);
              }}
              style={{ background: "none", border: "none", color: "inherit", textDecoration: "underline", cursor: "pointer" }}
            >
              {row?.attributes?.identityObj?.attributes?.displayName}
            </button>
          </div>
          <div className="text-sm">{row?.attributes?.identityObj?.attributes?.identity}</div>
        </div>
      ),
    },
    {
      label: "Issued By",
      name: "attributes.displayName",
      render: (row) => {
        const verifierName = row?.attributes?.trustedIssuerObj?.attributes?.verifierName;
        const address = row?.attributes?.trustedIssuerObj?.attributes?.issuer;
        const createdDate = row?.attributes?.trustedIssuerObj?.attributes?.createdAt;
        const style = {};

        if (!verifierName) {
          style.color = "#CCCCCC";
        }

        return (
          <>
            <div style={style}>
              <span> {verifierName || `<${address}>`}</span>
            </div>
            <div>{moment(createdDate).format("MM/DD/YY, h:mm a")}</div>
          </>
        );
      },
    },
  ];
  return (
    <div>
      <Breadcrumb
        className="bg-transparent"
        items={[
          {
            title: <Link to={"/"}>Home</Link>,
          },
          {
            title: <Link to={"/topics"}>Claim Topic</Link>,
          },
          {
            title: topicId,
          },
        ]}
      />
      <br />
      <br />
      <Tabs
        onChange={onChange}
        type="card"
        items={[
          {
            label: `Trusted Issuer`,
            key: 1,
            children: (
              <ObjectList
                title="Trusted Issuers Managing Accredited Investors"
                description=" "
                columns={trustedIssuerColumns}
                actions={[]}
                globalActions={[]}
                search={true}
                data={trustedIssuers}
                pageSize={10}
              />
            ),
          },
          {
            label: `Digital ID's`,
            key: 2,
            children: (
              <ObjectList
                title="Identities represent individuals that can be related to Claim Topics"
                description=" "
                columns={digitalIdsColumns}
                actions={[]}
                globalActions={[]}
                search={true}
                data={claims}
                pageSize={10}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

export default ViewClaimTopic;
