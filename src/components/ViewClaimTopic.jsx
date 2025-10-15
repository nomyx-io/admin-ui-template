import React, { useEffect, useState, useCallback, useMemo } from "react";

import { Tabs } from "antd";
import moment from "moment";
import { useNavigate, useParams, useLocation } from "../hooks/useNextRouter";

import ObjectList from "./ObjectList";
import PageCard from "./shared/PageCard";
import { createExplorerLink } from "@nomyx/shared";

function ViewClaimTopic({ service }) {
  const navigate = useNavigate();
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [claimTopicDetails, setClaimTopicDetails] = useState(null);
  // Route parameter is 'id' from /topics/[id].tsx
  const { id: topicId } = useParams();

  // Create ExplorerLink component
  const ExplorerLink = useMemo(() => createExplorerLink(React, { useMemo }), []);

  // Get the explorer URL from the service prop
  const explorerUrl = useMemo(() => {
    if (service && typeof service.getExplorerUrl === 'function') {
      return service.getExplorerUrl();
    }
    return null;
  }, [service]);

  const fetchData = useCallback(async () => {
    console.log('[ViewClaimTopic] fetchData called with topicId:', topicId);
    if (!service || !topicId) {
      console.log('[ViewClaimTopic] Service or topicId not available');
      return;
    }

    try {
      // Get all claim topics and find the one matching our ID
      const allTopics = await service.getClaimTopics();
      console.log('[ViewClaimTopic] All topics:', allTopics);

      const matchingTopic = allTopics.find(t =>
        t.id?.toString() === topicId.toString() ||
        t.attributes?.topic?.toString() === topicId.toString()
      );
      console.log('[ViewClaimTopic] Matching topic:', matchingTopic);

      if (matchingTopic) {
        setClaimTopicDetails([matchingTopic]);
      }

      // Get trusted issuers and filter by this topic
      const allIssuers = await service.getTrustedIssuers();
      console.log('[ViewClaimTopic] All issuers:', allIssuers);

      const issuersWithTopic = allIssuers.filter((issuer) => {
        const claimTopics = issuer.attributes?.claimTopics || [];
        return claimTopics.some((ct) => ct.topic?.toString() === topicId.toString());
      });
      console.log('[ViewClaimTopic] Issuers with topic:', issuersWithTopic);
      setTrustedIssuers(issuersWithTopic);

      // Get identities and filter by those with this claim topic
      const allIdentities = await service.getIdentities();
      console.log('[ViewClaimTopic] All identities:', allIdentities);

      const identitiesWithClaim = [];

      for (const identity of allIdentities) {
        const address = identity.attributes?.address || identity.address;
        if (!address) continue;

        try {
          const claims = await service.getIdentityClaims(address);
          const hasClaim = claims.some(claim => {
            const claimTopic = typeof claim === 'object' ? claim.topic : claim;
            return Number(claimTopic) === Number(topicId);
          });

          if (hasClaim) {
            // Find trusted issuer for this topic
            const trustedIssuerObj = issuersWithTopic.find(issuer => {
              const issuerTopics = issuer.attributes?.claimTopics || [];
              return issuerTopics.some(ct => Number(ct.topic) === Number(topicId));
            });

            identitiesWithClaim.push({
              attributes: {
                identity: address,
                identityObj: identity,
                trustedIssuerObj: trustedIssuerObj || null
              }
            });
          }
        } catch (error) {
          console.error(`[ViewClaimTopic] Error getting claims for identity ${address}:`, error);
        }
      }

      console.log('[ViewClaimTopic] Identities with claim:', identitiesWithClaim);
      setClaims(identitiesWithClaim);
    } catch (error) {
      console.error('[ViewClaimTopic] Error fetching data:', error);
    }
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
          <div className="text-sm">
            <ExplorerLink
              type="address"
              value={row?.attributes?.issuer}
              explorerUrl={explorerUrl}
            />
          </div>
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
      label: "Managed Compliance Rules",
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
          <div className="text-sm">
            <ExplorerLink
              type="address"
              value={row?.attributes?.identityObj?.attributes?.identity}
              explorerUrl={explorerUrl}
            />
          </div>
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
              <span>{verifierName || 'Unknown Issuer'}</span>
            </div>
            <div className="text-sm">
              {address && (
                <ExplorerLink
                  type="address"
                  value={address}
                  explorerUrl={explorerUrl}
                />
              )}
            </div>
            <div>{moment(createdDate).format("MM/DD/YY, h:mm a")}</div>
          </>
        );
      },
    },
  ];
  return (
    <PageCard title={`Compliance Rule Details - Topic ${topicId}`}>
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
                title="Identities represent individuals that can be related to Compliance Rules"
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
    </PageCard>
  );
}

export default ViewClaimTopic;
