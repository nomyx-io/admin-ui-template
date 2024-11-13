import { useState, useEffect } from "react";
import { List, Button, Modal, Checkbox, Form, InputNumber } from "antd";
import ObjectList from "./ObjectList";
import { useNavigate } from "react-router-dom";
import { NomyxAction } from "../utils/Constants";

const AddTrustedIssuerDialog = ({ service, visible, setVisibility, addTrustedIssuer }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Add Trusted Issuer"
      visible={visible}
      onCancel={() => setVisibility({ add: false })}
      onOk={() =>
        form.validateFields().then(async (values) => {
          form.resetFields();
          await addTrustedIssuer(values.issuer, values.topics);
          setVisibility({ add: false });
        })
      }
    >
      <Form form={form} name="addTrustedIssuerForm">
        <Form.Item
          name="issuer"
          label="Issuer"
          rules={[
            {
              required: true,
              message: "Please input the Issuer",
            },
          ]}
        >
          <InputNumber />
        </Form.Item>
        <Form.Item
          name="topics"
          label="Claim Topics"
          rules={[
            {
              required: true,
              message: "Please input one or more claim topics",
            },
          ]}
        >
          <InputNumber />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const RemoveTrustedIssuerDialog = ({ service, visible, setVisibility, issuer, removeTrustedIssuer }) => {
  return (
    <Modal
      title="Remove Trusted Issuer"
      visible={visible}
      onCancel={() => setVisibility({ remove: false })}
      onOk={async () => {
        await removeTrustedIssuer(issuer.id);
        setVisibility({ remove: false });
      }}
    >
      Do you really want to remove Trusted Issuer {issuer.id}?
    </Modal>
  );
};

const TrustedIssuersPage = ({ service }) => {
  const navigate = useNavigate();
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const [selectedIssuer, setSelectedIssuer] = useState({});
  // modals visibility
  const [isVisible, setVisibility] = useState({ add: false, edit: false, remove: false });

  useEffect(() => {
    fetchData();
  }, [service]);

  async function fetchData() {
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
  }
  const addTrustedIssuer = async (issuer, claimTopics) => {
    await service.addTrustedIssuer(issuer, claimTopics);
  };

  const removeTrustedIssuer = async (issuer) => {
    await service.removeTrustedIssuer(issuer);
    fetchData();
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
      default:
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
