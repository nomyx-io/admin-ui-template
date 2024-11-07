import React, { useState } from 'react';

const ClaimsPage = ({ service }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const handleAddClaim = async (identity, claimTopic, claim) => {
    const signer = service.provider.getSigner();
    await service.addClaim(signer, identity, claimTopic, claim);
  };

  const handleRemoveClaim = async (identity, claimTopic) => {
    const signer = service.provider.getSigner();
    await service.removeClaim(signer, identity, claimTopic);
  };

  return (
    <div className="bg-white text-gray-800">
      <button onClick={() => setShowAddDialog(true)} className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Add Claim</button>
      <button onClick={() => setShowRemoveDialog(true)} className="bg-red-500 text-white px-4 py-2 rounded">Remove Claim</button>

      <ClaimsList />

      <AddClaimDialog visible={showAddDialog} onClose={() => setShowAddDialog(false)} onSubmit={handleAddClaim} />
      <RemoveClaimDialog visible={showRemoveDialog} onClose={() => setShowRemoveDialog(false)} onSubmit={handleRemoveClaim} />
    </div>
  );
};

const AddClaimDialog = ({ visible, onClose, onSubmit }) => {
  const [claim, setClaim] = useState('');

  const handleSubmit = () => {
    onSubmit(/* pass your identity, claimTopic, and claim variables here */);
    onClose();
    setClaim('');
  };

  return (
    <div className={`${visible ? '' : 'hidden'} absolute inset-0 flex items-center justify-center z-50`}>
      <div className="bg-white p-4 rounded shadow">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="claim">Claim</label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter your claim here"
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
        />
        <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">
          Submit
        </button>
        <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded mt-4">Close</button>
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
    <div className={`${visible ? '' : 'hidden'} absolute inset-0 flex items-center justify-center z-50`}>
      <div className="bg-white p-4 rounded shadow">
        Are you sure you want to remove the selected claims?
        <label className="block text-gray-700 text-sm font-bold mb-2">
          <input
            type="checkbox"
            className="mr-2"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
          />
          Yes, I am sure
        </label>

        <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">
          Submit
        </button>
        <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded mt-4">Close</button>
      </div>
    </div>
  );
};

const ClaimsList = ({ claims }) => {
  return (
    <div className="mt-4">
      {claims.map(claim => <ClaimListItem claim={claim} />)}
    </div>
  );
};

const ClaimListItem = ({ claim }) => (
  <div className="bg-white p-4 rounded shadow mb-2 flex items-center">
    <input type="checkbox" className="mr-2" /><span className="text-gray-700">{claim.name}</span>
  </div>
);

export default ClaimsPage;