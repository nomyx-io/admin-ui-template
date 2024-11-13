import React, { useState, useEffect } from "react";
import { Button, Input, Tooltip } from "antd";
import { ShareIcon } from "../Assets/icons";
import { ClaimCard } from "./ClaimCard";
import { useNavigate, useParams } from "react-router-dom";

const EditClaimsSummaryView = ({ service }) => {
  const { identity } = useParams();
  const navigate = useNavigate();
  const data = JSON.parse(identity); // Parse the stringified identity object

  // Log the incoming data to see what is being passed
  const [displayName, setDisplayName] = useState(`${process.env.REACT_APP_ETHERSCAN_BASE_URL}${data.data.events[0].transactionHash}`);
  const [isCopied, setIsCopied] = useState(false);

  function copyToClipboard(id) {
    let copyText = document.getElementById(id);
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value);
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }

  return (
    <div>
      <div className="flex justify-between items-center  py-6">
        <p className="text-xl">Claims Saved</p>
        <Button onClick={() => window.open(displayName)} type="text" className="px-5 text-[#9952b3] flex gap-3 items-center">
          <ShareIcon /> Preview Link
        </Button>
      </div>
      <hr></hr>
      <div className="p-6 max-[500px]:px-4 flex flex-col gap-4">
        <div>
          <label htmlFor="link">Link</label>
          <div className="mt-3 relative w-full flex">
            <Input
              id="link"
              className="w-full p-2 text-xl"
              placeholder="Enter Display Name"
              type="text"
              maxLength={32}
              onChange={(e) => setDisplayName(e.target.value)}
              value={displayName}
              suffix={
                <Tooltip title={isCopied ? "Copied!" : "Copy text!"}>
                  <button onClick={() => copyToClipboard("link")}>
                    <img src={require("../images/copy-icon.png")} alt="Copy to Clipboard"></img>
                  </button>
                </Tooltip>
              }
              disabled
            />
          </div>
        </div>
        <br />
        {/* Log the claim data passed to ClaimCard */}
        <ClaimCard data={data.data} setClaim={true} />
      </div>
      <div className="flex justify-end max-[500px]:justify-center">
        <Button onClick={() => navigate("/identities")} className="max-[500px]:w-[50%] rounded-lg my-6 mr-6 h-11 px-10 bg-[#9952b3] text-white">
          Done
        </Button>
      </div>
    </div>
  );
};

export default EditClaimsSummaryView;
