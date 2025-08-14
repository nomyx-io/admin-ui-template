import React from "react";
import { useRouter } from "next/router";
import { Card, Row, Col, Statistic, Button, Space, Typography } from "antd";
import { 
  UserOutlined, 
  SafetyOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  SettingOutlined
} from "@ant-design/icons";
import AppLayout from "../components/AppLayout";

const { Paragraph } = Typography;

export default function DashboardPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="container" style={{ padding: "24px" }}>
        <header className="table-header" style={{ position: "relative", marginBottom: "24px" }}>
          <h1>Welcome to NomyxID</h1>
          <h2>Decentralized Identity Management</h2>
        </header>
        
        {/* Information Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card>
              <Row justify="center" align="middle">
                <Col span={24}>
                  <Paragraph>
                    To create a compliance rule, navigate to the "Compliance Rules" section in the Nomyx dashboard. Here, you can define a new rule by
                    providing a unique identifier and a descriptive name. This process ensures that each compliance rule is distinct and easily
                    recognizable. Once created, these compliance rules can be used to tag and organize various rules associated with an identity,
                    providing a structured and clear representation of the identity's attributes.
                  </Paragraph>
                  <Paragraph>
                    In the "Identities" section, you can create new identities by generating a DID and associating it with relevant compliance rules.
                    You can also update existing identities, adding or modifying rules to reflect changes in attributes or status. This flexible and
                    decentralized method of managing identities allows for a robust and scalable system that can adapt to various use cases, from
                    personal identity management to organizational credentialing.
                  </Paragraph>
                  <Paragraph>
                    The minted token can then be transferred or sold, carrying with it the embedded rules that can be verified independently. This
                    approach leverages the power of blockchain technology to provide immutable and transparent records, enhancing trust and authenticity
                    in digital transactions.
                  </Paragraph>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Digital Identities"
                value={0}
                prefix={<UserOutlined />}
              />
              <Button 
                type="link" 
                onClick={() => router.push("/identities")}
                style={{ padding: 0, marginTop: 8 }}
              >
                Manage Identities →
              </Button>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Trusted Issuers"
                value={0}
                prefix={<SafetyOutlined />}
              />
              <Button 
                type="link" 
                onClick={() => router.push("/issuers")}
                style={{ padding: 0, marginTop: 8 }}
              >
                Manage Issuers →
              </Button>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Claim Topics"
                value={0}
                prefix={<FileTextOutlined />}
              />
              <Button 
                type="link" 
                onClick={() => router.push("/topics")}
                style={{ padding: 0, marginTop: 8 }}
              >
                Manage Topics →
              </Button>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Claims"
                value={0}
                prefix={<CheckCircleOutlined />}
              />
              <Button 
                type="link" 
                onClick={() => router.push("/claims")}
                style={{ padding: 0, marginTop: 8 }}
              >
                View Claims →
              </Button>
            </Card>
          </Col>
        </Row>

      </div>
    </AppLayout>
  );
}