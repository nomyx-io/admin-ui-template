import React, { useState, useContext } from "react";

import { Breadcrumb, Button, Input, Switch } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import { isEthereumAddress } from "../utils";

function CreateAddressBookEntry({ service }) {
  const navigate = useNavigate();
  const { user } = useContext(RoleContext);

  const [name, setName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [email, setEmail] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const validateFields = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return false;
    }
    if (!walletAddress.trim()) {
      toast.error("Wallet Address is required");
      return false;
    }
    if (!isEthereumAddress(walletAddress)) {
      toast.error("Invalid Wallet Address");
      return false;
    }
    if (!email.trim()) {
      toast.error("Email is required");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateFields()) return;
    const currentUserId = user?.objectId;
    try {
      toast
        .promise(
          service.createAddressBookEntry({
            name: name.trim(),
            walletAddress: walletAddress.trim(),
            email: email.trim(),
            isInternal,
            createdBy: currentUserId,
          }),
          {
            pending: "Creating Address Book Entry...",
            success: "Address Entry created successfully",
            error: "Failed to create address book entry",
          }
        )
        .then(() => {
          navigate("/address-book");
        });
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div>
      <Breadcrumb
        className="bg-transparent"
        items={[{ title: <Link to="/">Home</Link> }, { title: <Link to="/address-book">Address Book</Link> }, { title: "Add" }]}
      />
      <p className="text-xl p-6">Create Address Book Entry</p>
      <hr />
      <div className="p-3 mt-2 space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="entryName">Name *</label>
          <Input
            id="entryName"
            value={name}
            placeholder="Enter Name"
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            className="border w-full p-2 rounded-lg text-xl"
          />
        </div>

        {/* Wallet Address */}
        <div>
          <label htmlFor="walletAddress">Wallet Address *</label>
          <Input
            id="walletAddress"
            value={walletAddress}
            placeholder="Enter Wallet Address"
            onChange={(e) => setWalletAddress(e.target.value)}
            maxLength={64}
            className="border w-full p-2 rounded-lg text-xl"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email">Email *</label>
          <Input
            id="email"
            value={email}
            placeholder="Enter Email"
            onChange={(e) => setEmail(e.target.value)}
            className="border w-full p-2 rounded-lg text-xl"
          />
        </div>

        {/* isInternal */}
        <div className="flex items-center gap-3">
          <label htmlFor="isInternal">Is Internal?</label>
          <Switch id="isInternal" checked={isInternal} onChange={setIsInternal} />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-[#7F56D9] text-white font-semibold h-11 rounded" onClick={handleSave}>
            Save Address Book Entry
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreateAddressBookEntry;
