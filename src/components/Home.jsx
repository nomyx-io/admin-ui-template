import React from "react";
import { Row, Col, Card, Typography, Button } from "antd";
import NomyxLogo from "../Assets/nomyx.svg";

const { Title, Paragraph } = Typography;

const Home = () => {
  return (
    <div className="container">
      <header className="table-header" style={{ position: "relative" }}>
        <h1>Welcome to NomyxID</h1>
        <h2>Decentralized Identity Management</h2>
        <img src={NomyxLogo} alt="Nomyx Logo" style={{ position: "absolute", top: 0, right: 10, width: "30%" }} />
      </header>
      <Row justify="center" gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Row justify="center" align="middle">
              <Col span={24}>
                <Paragraph>
                  To create a claim topic, navigate to the "Claim Topics" section in the Nomyx dashboard. Here, you can define a new topic by
                  providing a unique identifier and a descriptive name. This process ensures that each claim topic is distinct and easily
                  recognizable. Once created, these claim topics can be used to tag and organize various claims associated with an identity, providing
                  a structured and clear representation of the identity's attributes.
                </Paragraph>
                <Paragraph>
                  In the "Identities" section, you can create new identities by generating a DID and associating it with relevant claim topics. You
                  can also update existing identities, adding or modifying claims to reflect changes in attributes or status. This flexible and
                  decentralized method of managing identities allows for a robust and scalable system that can adapt to various use cases, from
                  personal identity management to organizational credentialing.
                </Paragraph>
                <Paragraph>
                  The minted token can then be transferred or sold, carrying with it the embedded claims that can be verified independently. This
                  approach leverages the power of blockchain technology to provide immutable and transparent records, enhancing trust and authenticity
                  in digital transactions.
                </Paragraph>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;
