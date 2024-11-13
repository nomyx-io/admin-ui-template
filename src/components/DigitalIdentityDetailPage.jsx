import React, { useState, useEffect } from "react";

import { Breadcrumb, Button, Input } from "antd";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ClaimCard } from "./ClaimCard";

function DigitalIdentityDetailView({ service }) {
  const { identityId } = useParams();
  const [displayName, setDisplayName] = useState("");
  const [identity, setIdentity] = useState({});

  const navigate = useNavigate();

  const getIdentity = async () => {
    if (!service.getDigitalIdentity) return;
    let result = await service.getDigitalIdentity(identityId);
    setIdentity(result);
  };

  const backBtn = () => {
    navigate("/identities");
  };

  useEffect(() => {
    getIdentity();
  }, []);

  return (
    <div>
      <Breadcrumb
        className="bg-transparent"
        items={[
          {
            title: <Link to={"/"}>Home</Link>,
          },
          {
            title: <Link to={"/identities"}>Identities</Link>,
          },
          {
            title: identityId,
          },
        ]}
      />
      <p className="text-xl p-6">Identity Details</p>
      <hr></hr>
      <div className="p-6 max-[500px]:px-4 flex flex-col gap-4">
        <div>
          <label htmlFor="identityName">Identity display name *</label>
          <div className="mt-3 relative w-full flex">
            <Input
              id="identityName"
              value={identity?.displayName || ""}
              className="w-full p-2 text-xl"
              placeholder="Enter Display Name"
              type="text"
              maxLength={32}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="absolute right-5 top-3">{displayName.length}/32</p>
          </div>
        </div>
        <div className="border rounded-xl p-6 bg-white flex flex-col gap-3 ">
          <label htmlFor="investorWalletAddress">Investor Wallet Address</label>
          <input
            id="investorWalletAddress"
            value={identity?.address || " "}
            readOnly
            className="font-light text-4xl max-[500px]:text-base text-gray-300"
          ></input>
          <label htmlFor="investorIdAccountNumber">Investor KYC ID Provider Account Number</label>
          <input
            id="investorIdAccountNumber"
            value={identity?.accountNumber || " "}
            readOnly
            className="font-light text-4xl max-[500px]:text-base text-gray-300"
          ></input>
        </div>
        <p>Active Claims</p>
        {identity?.claims?.map((item) => {
          return <ClaimCard key={item.id} data={item} />;
        })}
      </div>
      <div className="flex justify-end max-[500px]:justify-center">
        <Button className="max-[500px]:w-[50%] rounded-none my-6 mr-6 h-11 px-10 bg-[#9952b3] text-white" onClick={backBtn}>
          Back
        </Button>
      </div>
    </div>
  );
}

export default DigitalIdentityDetailView;
