import { useState, useEffect } from "react";
import { useParams, useNavigate } from "../hooks/useNextRouter";
import { Form, Input, Button, Spin, Alert } from "antd";
import { ArrowLeftOutlined, InfoCircleOutlined } from "@ant-design/icons";

import useChainAwareData from "../hooks/useChainAwareData";

const EditClaimTopic = ({ service }) => {
  const { id } = useParams();
  const topicId = id;
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Use the chain-aware hook to fetch claim topic details
  const { 
    data: claimTopics, 
    loading: fetchingTopic,
    error,
    currentChain 
  } = useChainAwareData(
    service, 
    async (service) => {
      return await service.getClaimTopicById(topicId);
    }
  );

  const claimTopic = claimTopics?.[0];

  useEffect(() => {
    if (claimTopic) {
      form.setFieldsValue({
        topicId: claimTopic.attributes?.topic,
        displayName: claimTopic.attributes?.displayName || "",
      });
    }
  }, [claimTopic, form]);

  const handleDeleteAndRecreate = () => {
    navigate('/topics');
  };

  if (fetchingTopic || !service) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Spin size="large" />
        <span className="ml-3">Loading claim topic...</span>
      </div>
    );
  }

  if (!claimTopic) {
    return (
      <div className="p-6">
        <h1>Claim Topic Not Found</h1>
        <Button onClick={() => navigate("/topics")}>
          <ArrowLeftOutlined /> Back to Compliance Rules
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Button onClick={() => navigate("/topics")}>
          <ArrowLeftOutlined /> Back to Compliance Rules
        </Button>
      </div>

      <h1 className="text-2xl font-semibold mb-6">View Compliance Rule</h1>

      <Alert
        message="Compliance Rule Updates Not Supported"
        description="The blockchain does not support direct updates to compliance rules. To modify a compliance rule, you need to delete the existing one and create a new one with the desired changes."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        className="mb-6"
      />

      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Topic ID"
          name="topicId"
        >
          <Input disabled />
        </Form.Item>

        <Form.Item
          label="Display Name"
          name="displayName"
        >
          <Input disabled />
        </Form.Item>

        <div className="flex gap-4">
          <Button 
            type="primary" 
            danger
            onClick={() => navigate(`/topics`)}
          >
            Go to Compliance Rules to Delete
          </Button>
          <Button 
            type="primary"
            onClick={() => navigate(`/topics/create`)}
          >
            Create New Compliance Rule
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default EditClaimTopic;