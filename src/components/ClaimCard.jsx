import React, { useState } from "react";

import { Tooltip } from "antd";

import styles from "./ClaimCard.module.css";
export const ClaimCard = ({ data, setClaim = false }) => {
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
    <div className="max-[500px]:px-0 border rounded-xl p-6 bg-[#b39dd4] flex flex-col gap-3">
      <div className="flex justify-between max-[500px]:flex-col text-center">
        <p className="max-[500px]:text-sm">Claim Name</p>
        <div className="flex gap-2 justify-center">
          <p className="max-[500px]:text-xs">{data?.displayName || "N/A"}</p>
        </div>
      </div>
      {/*            <div className='flex justify-between max-[500px]:flex-col text-center'>
                <p className='max-[500px]:text-sm'>Claim expiration date</p>
                <div className='flex gap-2 justify-center'>
                    <p className='max-[500px]:text-xs'>{data.attributes.claimTopicObj.attributes.updatedAt.toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"})} (TBD)</p>
                </div>
            </div>*/}
      {!setClaim && (
        <div className="flex justify-between max-[500px]:flex-col text-center">
          <p className="max-[500px]:text-sm">Issue date</p>
          <div className="flex gap-2 justify-center">
            <p className="max-[500px]:text-xs">
              {new Date(data.updatedAt).toLocaleDateString("en-us", {
                weekday: "long",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      )}
      <div className="flex justify-between max-[500px]:flex-col text-center">
        <label htmlFor={`blockHash-${data.id}`} className={`max-[500px]:text-sm ${styles.cardFieldLabel}`}>
          Block hash
        </label>
        <div className="flex gap-2 justify-center w-full">
          <input
            type="text"
            id={`blockHash-${data?.blockHash + "_" + data?.topic}`}
            name={`blockHash-${data.id}`}
            className={styles.cardField}
            value={setClaim ? data?.blockHash : data?.blockHash}
            readOnly
          ></input>
          <Tooltip title={isCopied ? "Copied!" : "Copy text!"}>
            <button onClick={() => copyToClipboard(`blockHash-${data?.blockHash + "_" + data?.topic}`)}>
              <img src={require("../images/copy-icon.png")} alt="Copy to Clipboard"></img>
            </button>
          </Tooltip>
        </div>
      </div>
      <div className="flex justify-between max-[500px]:flex-col text-center">
        <label htmlFor={`transactionHash-${data.id}`} className={`max-[500px]:text-sm ${styles.cardFieldLabel}`}>
          Transaction hash
        </label>
        <div className="flex gap-2 justify-center w-full">
          <input
            type="text"
            id={`transactionHash-${data?.transactionHash + "_" + data?.topic}`}
            name={`transactionHash-${data.id}`}
            className={styles.cardField}
            value={setClaim ? data?.transactionHash : data?.transactionHash}
            readOnly
          ></input>
          <Tooltip title={isCopied ? "Copied!" : "Copy text!"}>
            <button onClick={() => copyToClipboard(`transactionHash-${data?.transactionHash + "_" + data?.topic}`)}>
              <img src={require("../images/copy-icon.png")} alt="Copy to Clipboard"></img>
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
