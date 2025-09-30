import { useState, useEffect, useCallback } from "react";

import { Breadcrumb, Button, Input, Select, message } from "antd";
import Parse from "parse";
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
  const [allUsers, setAllUsers] = useState([]); // [{id, email}]
  const [selectedRefEmail, setSelectedRefEmail] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingRef, setSavingRef] = useState(false);
  const [defaultRefEmailLabel, setDefaultRefEmailLabel] = useState("");

  // Determine identity type based on the templateId
  const templateId = personaData?.payload?.included?.filter((item) => item.type === "inquiry-template").map((item) => item.id)[0];

  const identityType =
    templateId === process.env.REACT_APP_PERSONA_KYC_TEMPLATEID ? "KYC" : templateId === process.env.REACT_APP_PERSONA_KYB_TEMPLATEID ? "KYB" : "";

  // Process verifications with specific labels
  const verifications = personaData?.payload?.included
    ?.filter((item) => item.type?.startsWith("verification"))
    .map((item, index) => {
      const kycLabels = [null, "Proof of Address Verification", "Selfie Verification", "Identity Verification"];
      const kybLabels = [
        "Business Address Verification",
        "Bank Verification",
        "EIN Verification",
        "Incorporation Verification",
        "Optional Verification 1",
        "Optional Verification 2",
      ];
      const defaultLabel = "Unknown Verification";

      let label;
      if (identityType === "KYC") {
        label = kycLabels[index] || (item.type ? toTitleCase(item.type.split("/")[1].replace("-", " ")) : defaultLabel);
      } else if (identityType === "KYB") {
        label = kybLabels[index] || (item.type ? toTitleCase(item.type.split("/")[1].replace("-", " ")) : defaultLabel);
      } else {
        label = item.type ? toTitleCase(item.type.split("/")[1].replace("-", " ")) : defaultLabel;
      }

      return {
        id: item.id,
        kind: label,
        status: item.attributes?.status?.toUpperCase() || "UNKNOWN",
      };
    });

  // Process documents with labels for KYC and KYB
  const documents = personaData?.payload?.included
    ?.filter((item) => {
      return item.type.startsWith("document");
    })
    .map((item, index) => {
      const kycLabels = ["Government Id", "Proof of Address"];
      const kybLabels = [
        "Proof of Business Address",
        "Bank Statement",
        "EIN Document",
        "Articles of Incorporation",
        "Optional Document 1",
        "Optional Document 2",
      ];

      let label;
      if (identityType === "KYC") {
        label = kycLabels[index] || toTitleCase(item.type.split("/")[1].replace("-", " "));
      } else if (identityType === "KYB") {
        label = kybLabels[index] || toTitleCase(item.type.split("/")[1].replace("-", " "));
      } else {
        label = toTitleCase(item.type.split("/")[1].replace("-", " "));
      }

      return {
        id: item.id,
        kind: label,
        status: item.attributes?.status.toUpperCase(),
      };
    });

  const navigate = useNavigate();

  const getIdentity = useCallback(async () => {
    let result;
    if (identityId === "pending" && userId) {
      if (!service.getPendingIdentities) return;
      const pendingUser = (await service.getPendingIdentities()).filter((item) => item.id === userId)[0];
      if (!pendingUser) {
        navigate("/identities");
        return;
      }
      result = {
        id: userId, // route id for pending
        displayName: `${pendingUser.attributes.firstName} ${pendingUser.attributes.lastName}`.trim(),
        address: pendingUser.attributes.walletAddress,
        accountNumber: pendingUser.attributes.personaReferenceId,
        personaData: pendingUser.attributes.personaVerificationData
          ? JSON.parse(pendingUser.attributes.personaVerificationData ?? "")?.data?.attributes
          : null,
        watchlistMatched: pendingUser.attributes.watchlistMatched,
        pepMatched: pendingUser.attributes.pepMatched,
      };
    } else {
      if (!service.getDigitalIdentity) return;
      result = await service.getDigitalIdentity(identityId);
      if (result && !result.id) {
        result.id = identityId;
      }
    }
    setIdentity(result);
  }, [service, identityId, userId, navigate]);

  const backBtn = () => {
    navigate("/identities");
  };

  useEffect(() => {
    getIdentity();
  }, [getIdentity]);

  useEffect(() => {
    (async () => {
      const walletAddress = identity?.address; // resolve _User by wallet
      if (!walletAddress) return;

      setLoadingUsers(true);
      try {
        // 1) Load dropdown options
        const users = await Parse.Cloud.run("getRegisteredUsers", {});
        const mapped = (users || []).map((u) => ({ id: u.objectId || u.id, email: u.email })).filter((u) => !!u.id && !!u.email);
        setAllUsers(mapped);

        // 2) Current referrer for this wallet
        const refEmail = await Parse.Cloud.run("getIdentityReferralEmail", { walletAddress });

        // 3) Default from env (plain email)
        const defaultEmail = (process.env.REACT_APP_DEFAULT_REFFERER || "").trim();
        setDefaultRefEmailLabel(defaultEmail || "(not configured)");

        // Choose selected value
        if (refEmail) {
          setSelectedRefEmail(refEmail);
        } else if (defaultEmail) {
          setSelectedRefEmail(defaultEmail);
        } else {
          setSelectedRefEmail("");
        }
      } catch (err) {
        console.error("Failed to load referrer info:", err);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [identity?.address]);

  const handleSaveReferredBy = async () => {
    const walletAddress = identity?.address;
    if (!walletAddress) {
      message.error("Wallet address not available");
      return;
    }
    if (!selectedRefEmail) {
      message.warning("Please select a referrer email");
      return;
    }
    setSavingRef(true);
    try {
      await Parse.Cloud.run("setIdentityReferralByEmail", {
        walletAddress,
        referrerEmail: selectedRefEmail.trim(),
      });
      message.success("Referred By saved.");
    } catch (e) {
      message.error(e?.message || "Could not save Referred By");
    } finally {
      setSavingRef(false);
    }
  };
  // ---------------------------------------------------------------------------

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

        {/* Referred By (Email) selector for THIS identity */}
        <div className="border rounded-xl p-6 bg-white flex flex-col gap-3 ">
          <label htmlFor="referredByEmail">Referred By (Email)</label>
          <div className="mt-3 w-full flex gap-2 items-center">
            <Select
              id="referredByEmail"
              className="w-full"
              showSearch
              allowClear={false} // ← updates only (no clearing)
              placeholder="Select referrer"
              loading={loadingUsers}
              value={selectedRefEmail || undefined}
              onChange={(val) => setSelectedRefEmail(val || "")}
              optionFilterProp="label"
              filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
              options={allUsers.map((u) => ({ label: u.email, value: u.email }))}
            />
            <Button className="rounded-none h-11 px-6 bg-[#9952b3] text-white" loading={savingRef} onClick={handleSaveReferredBy}>
              Save
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Defaults to <span className="font-mono">{defaultRefEmailLabel}</span> if none is set.
          </p>
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
                  <span className="mr-5">Matched</span>
                  <p className="rounded-full border px-4 py-1 text-xs font-bold border-red-500 text-red-500">Watchlist</p>
                </div>
              )}
              {identity?.pepMatched && (
                <div className="flex mb-2">
                  <span className="mr-5">Matched</span>
                  <p className="rounded-full border px-4 py-1 text-xs font-bold border-red-500 text-red-500">Politically Exposed Person</p>
                </div>
              )}
            </div>
            {verifications && (
              <div className="rounded-lg bg-white p-2">
                <p className="font-bold">Verifications</p>
                <div className="border rounded-xl p-6 bg-white flex flex-col gap-3">
                  {verifications.map((item) => {
                    const kind = item.kind || "Unknown Verification";
                    const status = item.status || "UNKNOWN";

                    return (
                      <div key={item.id} className="flex flex-col gap-2">
                        <label htmlFor={item.id}>{kind}</label>
                        <input id={item.id} value={status} readOnly className="font-light text-2xl max-[500px]:text-base text-gray-300" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {documents && (
              <div className="rounded-lg bg-white p-2">
                <p className="font-bold">Documents</p>
                <div className="border rounded-xl p-6 bg-white flex flex-col gap-3">
                  {documents.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2">
                      <label htmlFor={item.id}>{item.kind}</label>
                      <input id={item.id} value={item.status || ""} readOnly className="font-light text-2xl max-[500px]:text-base text-gray-300" />
                    </div>
                  ))}
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
