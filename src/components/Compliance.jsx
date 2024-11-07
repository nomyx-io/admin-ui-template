import React from 'react';
import { Transfer, Card, Row, Col } from 'antd';

const Compliance = ({
  claimTopics,
  targetKeys,
  selectedKeys,
  onChange,
  onSelectChange,
  onScroll
}) => {
  return (
    <Card title="Compliance Features">
      <Row justify="center" align="middle" style={{ height: '100%' }}>
        <Col span={24} style={{ display: 'flex', justifyContent: 'center', height: '100%' }}>
          <Transfer
            dataSource={claimTopics}
            titles={['Available Claims', 'Selected Claims']}
            showSelectAll={false}
            targetKeys={targetKeys}
            selectedKeys={selectedKeys}
            onChange={onChange}
            onSelectChange={onSelectChange}
            onScroll={onScroll}
            render={item => (
              <div>{item.name}</div>
            )}
            listStyle={{
              width: '100%',
              height: '300px',
            }}
            style={{ width: '100%' }} // Ensure the Transfer component takes the full width
          />
        </Col>
      </Row>
    </Card>
  );
};

export default Compliance;
