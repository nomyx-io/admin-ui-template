import { useState, useEffect, useCallback } from "react";

import { Breadcrumb, Button, Input } from "antd";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ClaimCard } from "./ClaimCard";

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function DigitalIdentityDetailView({ service }) {
  const { identityId, userId } = useParams();
  const [displayName, setDisplayName] = useState("");
  const [identity, setIdentity] = useState({});
  const personaData = identity?.personaData;
  const verifications = personaData?.payload?.included?.filter((item) => {
    return item.type.startsWith("verification");
  });
  const documents = personaData?.payload?.included?.filter((item) => {
    return item.type.startsWith("document");
  });

  const navigate = useNavigate();

  const getIdentity = useCallback(async () => {
    let result;
    if (identityId === "pending" && userId) {
      if (!service.getPendingIdentities) return;
      const user = (await service.getPendingIdentities()).filter((item) => item.id === userId)[0];
      if (!user) {
        navigate("/identities");
        return;
      }
      result = {
        displayName: `${user.attributes.firstName} ${user.attributes.lastName}`.trim(),
        address: user.attributes.walletAddress,
        accountNumber: user.attributes.personaReferenceId,
        personaData: user.attributes.personaVerificationData ? JSON.parse(user.attributes.personaVerificationData ?? "")?.data?.attributes : null,
        watchlistMatched: user.attributes.watchlistMatched,
        pepMatched: user.attributes.pepMatched,
      };
    } else {
      if (!service.getDigitalIdentity) return;
      result = await service.getDigitalIdentity(identityId);
    }
    setIdentity(result);
  }, [service, identityId]);

  const backBtn = () => {
    navigate("/identities");
  };

  useEffect(() => {
    getIdentity();
  }, [getIdentity]);

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
            title: identityId === "pending" ? "Pending" : identity?.displayName,
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
        {personaData && (
          <div className="flex flex-col gap-2 rounded-lg bg-gray-200 p-6">
            <div className="flex">
              <div className="flex mb-2 mr-5">
                <p className="mr-5">Verification Data</p>
                <span
                  className={`rounded-full border px-4 py-1 text-xs font-bold ${
                    personaData?.name?.split(".")[1]?.toUpperCase() === "APPROVED" || personaData?.name?.split(".")[1]?.toUpperCase() === "COMPLETED"
                      ? "border-green-500 text-green-500"
                      : "border-red-500 text-red-500"
                  }`}
                >
                  {personaData?.name?.split(".")[1]?.toUpperCase() || ""}
                </span>
              </div>
              {identity?.watchlistMatched && (
                <div className="flex mb-2 mr-5">
                  <p className="mr-5">Watchlist</p>
                  <span className="rounded-full border px-4 py-1 text-xs font-bold border-red-500 text-red-500">MATCHED</span>
                </div>
              )}
              {identity?.pepMatched && (
                <div className="flex mb-2">
                  <p className="mr-5">PEP</p>
                  <span className="rounded-full border px-4 py-1 text-xs font-bold border-red-500 text-red-500">MATCHED</span>
                </div>
              )}
            </div>
            {verifications && (
              <div className="rounded-lg bg-white p-2">
                <p className="font-bold">Verifications</p>
                <div className="border rounded-xl p-6 bg-white flex flex-col gap-3 ">
                  {verifications?.map((item) => {
                    return (
                      <>
                        <label htmlFor={item.id}>{toTitleCase(item.type.split("/")[1].replace("-", " "))}</label>
                        <input
                          id={item.id}
                          value={item?.attributes?.status.toUpperCase() || ""}
                          readOnly
                          className="font-light text-2xl max-[500px]:text-base text-gray-300"
                        ></input>
                      </>
                    );
                  })}
                </div>
              </div>
            )}
            {documents && (
              <div className="rounded-lg bg-white p-2">
                <p className="font-bold">Documents</p>
                <div className="border rounded-xl p-6 bg-white flex flex-col gap-3 ">
                  {documents?.map((item) => {
                    return (
                      <>
                        <label htmlFor={item.id}>{toTitleCase(item.type.split("/")[1].replace("-", " "))}</label>
                        <input
                          id={item.id}
                          value={item?.attributes?.status.toUpperCase() || ""}
                          readOnly
                          className="font-light text-2xl max-[500px]:text-base text-gray-300"
                        ></input>
                      </>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {identityId !== "pending" && <p>Active Claims</p>}
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
