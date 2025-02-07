import { useState, useEffect, useCallback, useContext } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";
import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { NomyxAction, WalletPreference } from "../utils/Constants";

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
//           label="Claim Topics"
//           rules={[
//             {
//               required: true,
//               message: "Please input one or more claim topics",
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
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  const fetchData = useCallback(async () => {
    const issuers = service.getTrustedIssuers && (await service.getTrustedIssuers());
    let data = [];
    if (issuers) {
      issuers.forEach((item) => {
        const claimTopicsString = item.attributes.claimTopics?.map((obj) => obj["topic"]).join(",") || "N/A";
        data.push({
          id: item.id,
          claimTopics: claimTopicsString,
          address: item.attributes.issuer,
          trustedIssuer: item.attributes.verifierName,
        });
      });
      setTrustedIssuers(data);
    }
  }, [service]);

  useEffect(() => {
    fetchData();
  }, [service, fetchData]);

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
      }
    } catch (error) {
      console.error("Unexpected error during removeTrustedIssuer:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const columns = [
    { label: "Trusted Issuer", name: "trustedIssuer", width: "25%" },
    { label: "Address", name: "address", width: "45%" },
    { label: "Managed Claim Topics", name: "claimTopics", width: "30%" },
  ];

  const actions = [
    { label: "Update Claim Topics", name: NomyxAction.UpdateClaimTopics },
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
        navigate("create");
        break;
      case NomyxAction.UpdateClaimTopics:
        navigate("/issuers/" + record.id);
        break;
      case NomyxAction.RemoveTrustedIssuer:
        removeTrustedIssuer(record.address);
        break;
      default:
        console.log("Unknown action: " + name);
        break;
    }
  };

  return (
    <div className="p-6">
      <ObjectList
        title="Trusted Issuers"
        description="Trusted Issuers can create Digital Identities and add Claim Topics to them"
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
