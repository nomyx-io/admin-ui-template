import { useState, useEffect, useCallback } from "react";

import { Button, Input } from "antd";
import { useNavigate, useParams } from "react-router-dom";

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
  const [isLoading, setIsLoading] = useState(true);
  const personaData = identity?.personaData;

  // Determine identity type based on the templateId
  const templateId = personaData?.payload?.included?.filter((item) => item.type === "inquiry-template").map((item) => item.id)[0];

  const identityType =
    templateId === process.env.REACT_APP_PERSONA_KYC_TEMPLATEID ? "KYC" : templateId === process.env.REACT_APP_PERSONA_KYB_TEMPLATEID ? "KYB" : "";

  // Process verifications
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
    setIsLoading(true);
    try {
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
    } finally {
      setIsLoading(false);
    }
  }, [service, identityId, userId, navigate]);

  const backBtn = () => {
    navigate("/identities");
  };

  useEffect(() => {
    getIdentity();
  }, [getIdentity]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 animate-fade-in-up">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="modern-card bg-white">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Identity Details</h2>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">View and manage identity information</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Identity Display Name */}
          <div className="space-y-2">
            <label htmlFor="identityName" className="block text-sm font-medium text-slate-700">
              Identity Display Name <span className="text-red-500">*</span>
            </label>
            <div className="relative w-full">
              <Input
                id="identityName"
                value={identity?.displayName || ""}
                className="w-full p-3 rounded-lg border border-gray-200 input-glow text-lg"
                placeholder="Enter Display Name"
                type="text"
                maxLength={32}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <span className="absolute right-3 top-3 text-xs text-gray-400">{displayName.length}/32</span>
            </div>
          </div>

          {/* Wallet & Account Info */}
          <div className="bg-slate-50 border border-gray-200 rounded-xl p-6 space-y-6">
            <div className="space-y-2">
              <label htmlFor="investorWalletAddress" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Investor Wallet Address
              </label>
              <div className="font-mono text-lg text-[var(--text-primary)] bg-white p-3 rounded border border-gray-100 truncate">
                {identity?.address || "N/A"}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="investorIdAccountNumber" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Investor KYC ID Provider Account Number
              </label>
              <div className="font-mono text-lg text-[var(--text-primary)] bg-white p-3 rounded border border-gray-100 truncate">
                {identity?.accountNumber || "N/A"}
              </div>
            </div>
          </div>

          {/* Persona Data */}
          {personaData && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Verification Status:</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold border ${
                      personaData?.name?.split(".")[1]?.toUpperCase() === "APPROVED" ||
                      personaData?.name?.split(".")[1]?.toUpperCase() === "COMPLETED"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}
                  >
                    {personaData?.name?.split(".")[1]?.toUpperCase() || "UNKNOWN"}
                  </span>
                </div>
                {identity?.watchlistMatched && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Watchlist:</span>
                    <span className="rounded-full px-3 py-1 text-xs font-bold bg-red-50 border border-red-200 text-red-700">Matched</span>
                  </div>
                )}
                {identity?.pepMatched && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">PEP Status:</span>
                    <span className="rounded-full px-3 py-1 text-xs font-bold bg-red-50 border border-red-200 text-red-700">Exposed</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {verifications && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-[var(--text-primary)] border-b pb-2">Verifications</h3>
                    <div className="space-y-3">
                      {verifications.map((item) => (
                        <div key={item.id} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-slate-500 uppercase mb-1">{item.kind}</p>
                          <p className={`text-sm font-medium ${item.status === "PASSED" ? "text-green-600" : "text-slate-900"}`}>{item.status}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {documents && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-[var(--text-primary)] border-b pb-2">Documents</h3>
                    <div className="space-y-3">
                      {documents.map((item) => (
                        <div key={item.id} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-slate-500 uppercase mb-1">{item.kind}</p>
                          <p className={`text-sm font-medium ${item.status === "PASSED" ? "text-green-600" : "text-slate-900"}`}>
                            {item.status || "N/A"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Claims */}
          {identityId !== "pending" && (
            <div className="space-y-4 pt-6 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Active Claims</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {identity?.claims?.map((item) => <ClaimCard key={item.id} data={item} />)}
                {(!identity?.claims || identity.claims.length === 0) && (
                  <p className="text-slate-500 text-sm italic col-span-full">No active claims found.</p>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end pt-6">
            <Button
              onClick={backBtn}
              className="h-11 px-8 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-all"
            >
              Back to Identities
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DigitalIdentityDetailView;
