import { useState, useContext } from "react";

import { useNavigate } from "../hooks/useNextRouter";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";
import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { NomyxAction, WalletPreference } from "../utils/Constants";
import useChainAwareData from "../hooks/useChainAwareData";

// const AddTrustedIssuerDialog = ({ service, visible, setVisibility, addTrustedIssuer }) => {
//   const [form] = Form.useForm();

//   return (
//     <Modal
//       title="Add Trusted Issuer"
//       visible={visible}
//       onCancel={() => setVisibility({ add: false })}
//       onOk={() =>
//         form.validateFields().then(async (values) => {
//           form.resetFields();
//           await addTrustedIssuer(values.issuer, values.topics);
//           setVisibility({ add: false });
//         })
//       }
//     >
//       <Form form={form} name="addTrustedIssuerForm">
//         <Form.Item
//           name="issuer"
//           label="Issuer"
//           rules={[
//             {
//               required: true,
//               message: "Please input the Issuer",
//             },
//           ]}
//         >
//           <InputNumber />
//         </Form.Item>
//         <Form.Item
//           name="topics"
//           label="Compliance Rules"
//           rules={[
//             {
//               required: true,
//               message: "Please input one or more compliance rules",
//             },
//           ]}
//         >
//           <InputNumber />
//         </Form.Item>
//       </Form>
//     </Modal>
//   );
// };

// const RemoveTrustedIssuerDialog = ({ service, visible, setVisibility, issuer, removeTrustedIssuer }) => {
//   return (
//     <Modal
//       title="Remove Trusted Issuer"
//       visible={visible}
//       onCancel={() => setVisibility({ remove: false })}
//       onOk={async () => {
//         await removeTrustedIssuer(issuer.id);
//         setVisibility({ remove: false });
//       }}
//     >
//       Do you really want to remove Trusted Issuer {issuer.id}?
//     </Modal>
//   );
// };

const TrustedIssuersPage = ({ service }) => {
  const navigate = useNavigate();
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  // Use the chain-aware hook to fetch trusted issuers
  const {
    data: rawIssuers,
    loading,
    refetch: fetchData,
    currentChain,
  } = useChainAwareData(service, async (service) => {
    return await service.getTrustedIssuers();
  });

  // Transform the raw data into the format needed for the table
  const trustedIssuers = [];
  if (rawIssuers) {
    rawIssuers.forEach((item) => {
      // Handle both wrapped (Ethereum) and unwrapped (Stellar) data formats
      let issuerData;
      
      if (item && item.attributes) {
        // Ethereum format with attributes wrapper
        issuerData = item.attributes;
      } else if (item && (item.issuerAddress || item.issuer_address || item.name)) {
        // Stellar format without wrapper
        issuerData = {
          issuer: item.issuerAddress || item.issuer_address,
          verifierName: item.name || `Issuer ${(item.issuerAddress || item.issuer_address || '').substring(0, 8)}...`,
          claimTopics: item.claimTopics || item.claim_topics || []
        };
      } else {
        console.warn("[TrustedIssuersPage] Skipping malformed issuer item:", item);
        return;
      }

      // Handle claim topics - they may be numbers or objects with topic property
      let claimTopicsString = "N/A";
      if (issuerData.claimTopics && Array.isArray(issuerData.claimTopics)) {
        claimTopicsString = issuerData.claimTopics
          .map((topic) => typeof topic === 'object' ? topic.topic : topic)
          .filter(t => t !== undefined && t !== null)
          .join(",") || "N/A";
      }

      trustedIssuers.push({
        id: issuerData.issuer || item.id || "unknown",  // Use address as ID for routing
        claimTopics: claimTopicsString,
        address: issuerData.issuer || "N/A",
        trustedIssuer: issuerData.verifierName || issuerData.name || "Unknown Issuer",
      });
    });
  }

  // const addTrustedIssuer = async (issuer, claimTopics) => {
  //   await service.addTrustedIssuer(issuer, claimTopics);
  // };

  const removeTrustedIssuer = async (issuer) => {
    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              // Initiate removal of the trusted issuer
              const { initiateResponse, error: initError } = await DfnsService.initiateRemoveTrustedIssuer(issuer, user.walletId, dfnsToken);
              if (initError) throw new Error(initError);

              // Complete removal of the trusted issuer
              const { completeResponse, error: completeError } = await DfnsService.completeRemoveTrustedIssuer(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge, // Assuming challenge is part of the initiateResponse
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              // Fetch updated data after successful removal
              setTimeout(fetchData, 3000);
            })(),
            {
              pending: "Removing Trusted Issuer...",
              success: `Successfully Removed Trusted Issuer ${issuer}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while removing Trusted Issuer ${issuer}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to remove Trusted Issuer:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        // Handle PRIVATE wallet preference
        toast
          .promise(
            (async () => {
              await service.removeTrustedIssuer(issuer);
              fetchData();
            })(),
            {
              pending: "Removing Trusted Issuer...",
              success: `Successfully Removed Trusted Issuer ${issuer}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while removing Trusted Issuer ${issuer}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to remove Trusted Issuer:", error);
          });
      } else {
        // Handle case where wallet is not connected - use service directly
        toast
          .promise(
            (async () => {
              await service.removeTrustedIssuer(issuer);
              fetchData();
            })(),
            {
              pending: "Removing Trusted Issuer...",
              success: `Successfully Removed Trusted Issuer ${issuer}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while removing Trusted Issuer ${issuer}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to remove Trusted Issuer:", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during removeTrustedIssuer:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const columns = [
    { label: "Trusted Issuer", name: "trustedIssuer", width: "25%" },
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
  const globalActions = [{ label: "Create Trusted Issuer", name: NomyxAction.CreateTrustedIssuer }];

  const search = true;

  const handleAction = async (event, name, record) => {
    switch (name) {
      case NomyxAction.CreateTrustedIssuer:
        navigate("/issuers/create");
        break;
      case NomyxAction.UpdateClaimTopics:
        // Use address as the ID for navigation
        navigate("/issuers/" + encodeURIComponent(record.address));
        break;
      case NomyxAction.RemoveTrustedIssuer:
        removeTrustedIssuer(record.address);
        break;
      default:
        console.log("Unknown action: " + name);
        break;
    }
  };

  // Show loading spinner while service is initializing
  if (loading || !service) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <span className="ml-3">Loading trusted issuers...</span>
      </div>
    );
  }

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
