import React, { useState, useEffect } from "react";

// Third-party UI/component libraries
import { yupResolver } from "@hookform/resolvers/yup";
import { Form, Input, Row, Col, Card, Button } from "antd";
// Form and validation libraries
import { useForm, Controller } from "react-hook-form";
import { toast } from "react-toastify";
import * as yup from "yup";

// Notifications
import "react-toastify/dist/ReactToastify.css";

// Local components
import Compliance from "./Compliance";

// Validation Schema
const validationSchema = yup.object().shape({
  nftTitle: yup.string().required("NFT Title is required"),
  description: yup.string().required("Description is required"),
  mintAddress: yup
    .string()
    .required("Mint Address is required")
    .matches(/^0x[a-fA-F0-9]{40}$/, "Mint Address must be a valid wallet address"),
  price: yup.string().required("Price is required"),
});

// MintPage Component
const MintPage = ({ service }) => {
  // State Variables
  const [defaultTokenImageUrl, setDefaultTokenImageUrl] = useState("");
  const [frozen, setFrozen] = useState(false);
  const [claimTopics, setClaimTopics] = useState([]);
  const [targetKeys, setTargetKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form Handling with react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(validationSchema),
  });

  // Fetch compliance rules from Service
  useEffect(() => {
    const fetchClaimTopics = async () => {
      try {
        const result = await service.getClaimTopics();
        setClaimTopics(
          result.map((topic, index) => ({
            key: index.toString(),
            id: topic.attributes.topic,
            name: topic.attributes.displayName,
            description: topic.attributes.description,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch compliance rules", error);
      }
    };
    fetchClaimTopics();
  }, [service]);

  // Form Fields
  const fields = [
    {
      label: "Asset Name",
      type: "string",
      name: "nftTitle",
      placeholder: "Enter Asset Name",
    },
    {
      label: "Description",
      type: "string",
      name: "description",
      placeholder: "Add a description for the NFT",
    },
    {
      label: "Mint To",
      type: "string",
      name: "mintAddress",
      placeholder: "Enter Wallet Address",
    },
    {
      label: "Pricing",
      type: "number",
      name: "price",
      placeholder: "Enter Price",
    },
  ];

  // Mint Handler
  const handleMint = async (data) => {
    setLoading(true);
    const metadata = [
      { key: "nftTitle", attributeType: 1, value: data.nftTitle },
      { key: "description", attributeType: 1, value: data.description },
      { key: "mintAddress", attributeType: 1, value: data.mintAddress },
      { key: "price", attributeType: 1, value: data.price },
      { key: "image", attributeType: 1, value: defaultTokenImageUrl },
      { key: "frozen", attributeType: 1, value: frozen.toString() },
      { key: "claimTopics", attributeType: 0, value: targetKeys.join(",") },
    ];

    // Toast Notification for Minting
    toast.promise(
      service
        .mint(metadata)
        .then(() => {
          setTargetKeys([]);
          setSelectedKeys([]);
          reset();
        })
        .finally(() => setLoading(false)),
      {
        pending: "Issuing asset...",
        success: `Successfully minted NFT to ${data.mintAddress}`,
        error: "An error occurred while issuing asset",
      }
    );
  };

  // Transfer Handlers
  const handleChange = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys);
  };

  const handleSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  // Render
  return (
    <div className="container">
      <header className="table-header">
        <h1>Mint Token</h1>
        <h2>
          Fill out the form below to mint a new NFT. Provide all the necessary details to ensure the NFT is created with the correct information.
        </h2>
      </header>

      <Form onFinish={handleSubmit(handleMint)} layout="vertical">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card>
              <Row gutter={16}>
                {fields.map((field) => (
                  <Col span={12} key={field.name}>
                    <Form.Item label={field.label} validateStatus={errors[field.name] ? "error" : ""} help={errors[field.name]?.message}>
                      <Controller
                        name={field.name}
                        control={control}
                        defaultValue=""
                        render={({ field: { onChange, value } }) => (
                          <Input
                            type={field.type === "number" ? "number" : "text"}
                            placeholder={field.placeholder}
                            value={value}
                            onChange={onChange}
                          />
                        )}
                      />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>

          <Col span={24}>
            <Compliance
              claimTopics={claimTopics}
              targetKeys={targetKeys}
              selectedKeys={selectedKeys}
              onChange={handleChange}
              onSelectChange={handleSelectChange}
            />
          </Col>
        </Row>

        <Form.Item>
          <Row justify="end" style={{ marginTop: "20px" }}>
            <Button type="primary" className="mint-submit-btn" htmlType="submit" loading={loading}>
              Submit
            </Button>
          </Row>
        </Form.Item>
      </Form>
    </div>
  );
};

export default MintPage;
