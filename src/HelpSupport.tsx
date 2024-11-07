import React from 'react';
import { Collapse,  Menu, Image, Input } from 'antd';

const { Panel } = Collapse;
const { TextArea } = Input;

const HelpSupport = () => {
  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Help & Support</h1>
      <Collapse className="shadow-md mb-4">
        <Panel header="FAQ 1" key="1">
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </Panel>
        <Panel header="FAQ 2" key="2">
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </Panel>
      </Collapse>

      <div className="shadow-md mb-4 p-4">
        <TextArea placeholder="Type message here ..." className="shadow-md"/>
      </div>

      <Menu mode="inline" className="shadow-md mb-4">
        <Menu.Item key="1">
          <Image placeholder="Add actual Image source here" />
          Support Request
        </Menu.Item>
        <Menu.Item key="2">
          <Image placeholder="Add actual Image source here" />
          Contact Us
        </Menu.Item>
      </Menu>
    </div>
  );
};

export default HelpSupport;