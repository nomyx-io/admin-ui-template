import React, { useState, useContext } from "react";

import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { WalletPreference } from "../utils/Constants";

const ClaimsPage = ({ service }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  const handleAddClaim = async (identity, claimTopic, claim) => {
    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Initiate adding the claim
        const { initiateResponse, error: initError } = await DfnsService.initiateAddClaim(identity, claimTopic, claim, user.walletId, dfnsToken);
        if (initError) throw new Error(initError);

        // Complete adding the claim
        const { completeResponse, error: completeError } = await DfnsService.completeAddClaim(
          user.walletId,
          dfnsToken,
          initiateResponse.challenge,
          initiateResponse.requestBody
        );
        if (completeError) throw new Error(completeError);
      } else if (walletPreference === WalletPreference.PRIVATE) {
        const signer = service.provider.getSigner();
        await service.addClaim(signer, identity, claimTopic, claim);
      }
    } catch (error) {
      console.error("Unexpected error during Add Claim:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const handleRemoveClaim = async (identity, claimTopic) => {
    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Initiate removing the claim
        const { initiateResponse, error: initError } = await DfnsService.initiateRemoveClaim(identity, claimTopic, user.walletId, dfnsToken);
        if (initError) throw new Error(initError);
        // Complete removing claim topic
        const { completeResponse, error: completeError } = await DfnsService.completeRemoveClaim(
          user.walletId,
          dfnsToken,
          initiateResponse.challenge,
          initiateResponse.requestBody
        );
        if (completeError) throw new Error(completeError);
      } else if (walletPreference === WalletPreference.PRIVATE) {
        const signer = service.provider.getSigner();
        await service.removeClaim(signer, identity, claimTopic);
      }
    } catch (error) {
      console.error("Unexpected error during Remove Claim:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="bg-white text-gray-800">
      <button onClick={() => setShowAddDialog(true)} className="bg-blue-500 text-white px-4 py-2 rounded mr-4">
        Add Claim
      </button>
      <button onClick={() => setShowRemoveDialog(true)} className="bg-red-500 text-white px-4 py-2 rounded">
        Remove Claim
      </button>

      <ClaimsList />

      <AddClaimDialog visible={showAddDialog} onClose={() => setShowAddDialog(false)} onSubmit={handleAddClaim} />
      <RemoveClaimDialog visible={showRemoveDialog} onClose={() => setShowRemoveDialog(false)} onSubmit={handleRemoveClaim} />
    </div>
  );
};

const AddClaimDialog = ({ visible, onClose, onSubmit }) => {
  const [claim, setClaim] = useState("");

  const handleSubmit = () => {
    onSubmit(/* pass your identity, claimTopic, and claim variables here */);
    onClose();
    setClaim("");
  };

  return (
    <div className={`${visible ? "" : "hidden"} absolute inset-0 flex items-center justify-center z-50`}>
      <div className="bg-white p-4 rounded shadow">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="claim">
          Claim
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter your claim here"
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
        />
        <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">
          Submit
        </button>
        <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded mt-4">
          Close
        </button>
      </div>
    </div>
  );
};

const RemoveClaimDialog = ({ visible, onClose, onSubmit }) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleSubmit = () => {
    if (isChecked) {
      onSubmit(/* pass your identity and claimTopic variables here */);
    }
    onClose();
    setIsChecked(false);
  };

  return (
    <div className={`${visible ? "" : "hidden"} absolute inset-0 flex items-center justify-center z-50`}>
      <div className="bg-white p-4 rounded shadow">
        Are you sure you want to remove the selected claims?
        <label className="block text-gray-700 text-sm font-bold mb-2">
          <input type="checkbox" className="mr-2" checked={isChecked} onChange={(e) => setIsChecked(e.target.checked)} />
          Yes, I am sure
        </label>
        <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">
          Submit
        </button>
        <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded mt-4">
          Close
        </button>
      </div>
    </div>
  );
};

const ClaimsList = ({ claims }) => {
  return (
    <div className="mt-4">
      {claims.map((claim) => (
        <ClaimListItem claim={claim} />
      ))}
    </div>
  );
};

const ClaimListItem = ({ claim }) => (
  <div className="bg-white p-4 rounded shadow mb-2 flex items-center">
    <input type="checkbox" className="mr-2" />
    <span className="text-gray-700">{claim.name}</span>
  </div>
);

export default ClaimsPage;
