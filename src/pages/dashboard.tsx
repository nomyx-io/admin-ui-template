import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, Button, Space } from "antd";
import Statistic from "antd/es/statistic";
import Typography from "antd/es/typography";
import Row from "antd/es/row";
import Col from "antd/es/col";
import UserOutlined from "@ant-design/icons/UserOutlined";
import LockOutlined from "@ant-design/icons/LockOutlined";
import CheckCircleOutlined from "@ant-design/icons/CheckCircleOutlined";
import GlobalOutlined from "@ant-design/icons/GlobalOutlined";
// React 19 compatibility workarounds for icons
const UserOutlinedIcon = UserOutlined as any;
const LockOutlinedIcon = LockOutlined as any;
const CheckCircleOutlinedIcon = CheckCircleOutlined as any;
const GlobalOutlinedIcon = GlobalOutlined as any;
import AppLayout from "../components/AppLayout";
import BlockchainService from "../services/BlockchainService";
import IdentityService from "../services/IdentityService";

const { Paragraph } = Typography;

export default function DashboardPage() {
  const router = useRouter();
  const [counts, setCounts] = useState({
    identities: 0,
    trustedIssuers: 0,
    claimTopics: 0,
    activeClaims: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Initialize blockchain service
        const blockchainService = new BlockchainService();
        const selectedChain = localStorage.getItem('nomyx-selected-chain') || 'stellar-testnet';
        await blockchainService.initialize(selectedChain);

        // Initialize identity service with blockchain service
        const identityService = new IdentityService(blockchainService, null);

        // Fetch all counts
        const [claimTopics, trustedIssuers, identities] = await Promise.all([
          blockchainService.getClaimTopics(),
          blockchainService.getTrustedIssuers(),
          identityService.getActiveIdentities(selectedChain)
        ]);

        // Count active claims (identities with claims assigned)
        const activeClaims = identities.filter(identity => {
          const claims = identity.attributes?.claims || [];
          return claims.length > 0;
        }).reduce((total, identity) => {
          return total + (identity.attributes?.claims?.length || 0);
        }, 0);

        setCounts({
          identities: identities.length,
          trustedIssuers: trustedIssuers.length,
          claimTopics: claimTopics.length,
          activeClaims: activeClaims
        });
      } catch (error) {
        console.error('[Dashboard] Error fetching counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

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
                value={counts.identities}
                prefix={<UserOutlinedIcon />}
                loading={loading}
              />
              <Button 
                type="primary" 
                onClick={() => router.push("/identities")}
                style={{ 
                  marginTop: 16,
                  width: '100%',
                  backgroundColor: '#722ed1',
                  borderColor: '#722ed1',
                  fontWeight: 500,
                  padding: '6px 16px',
                  height: '36px'
                }}
              >
                Manage Identities →
              </Button>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Trusted Issuers"
                value={counts.trustedIssuers}
                prefix={<LockOutlinedIcon />}
                loading={loading}
              />
              <Button 
                type="primary" 
                onClick={() => router.push("/issuers")}
                style={{ 
                  marginTop: 16,
                  width: '100%',
                  backgroundColor: '#722ed1',
                  borderColor: '#722ed1',
                  fontWeight: 500,
                  padding: '6px 16px',
                  height: '36px'
                }}
              >
                Manage Issuers →
              </Button>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Claim Topics"
                value={counts.claimTopics}
                prefix={<GlobalOutlinedIcon />}
                loading={loading}
              />
              <Button 
                type="primary" 
                onClick={() => router.push("/topics")}
                style={{ 
                  marginTop: 16,
                  width: '100%',
                  backgroundColor: '#722ed1',
                  borderColor: '#722ed1',
                  fontWeight: 500,
                  padding: '6px 16px',
                  height: '36px'
                }}
              >
                Manage Topics →
              </Button>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Claims"
                value={counts.activeClaims}
                prefix={<CheckCircleOutlinedIcon />}
                loading={loading}
              />
              <Button 
                type="primary" 
                onClick={() => router.push("/claims")}
                style={{ 
                  marginTop: 16,
                  width: '100%',
                  backgroundColor: '#722ed1',
                  borderColor: '#722ed1',
                  fontWeight: 500,
                  padding: '6px 16px',
                  height: '36px'
                }}
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