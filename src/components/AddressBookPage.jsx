import { useState, useEffect, useCallback } from "react";

import { Tabs } from "antd";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";
import ParseClient from "../services/ParseClient";
import { NomyxAction } from "../utils/Constants";

const { TabPane } = Tabs;

const AddressBookPage = ({ service }) => {
  const [addressBookEntries, setAddressBookEntries] = useState([]);
  const [activeTab, setActiveTab] = useState("AddressBook");
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  const fetchAddressBookData = useCallback(async () => {
    try {
      // Fetch address book entries from Parse
      const entries = await ParseClient.getRecords(
        "AddressBook",
        [], // No where conditions - get all
        [],
        ["user", "createdBy"], // Include user pointers
        1000,
        0,
        "createdAt",
        "desc"
      );

      if (!entries) {
        console.log("No AddressBook entries found - make sure the Parse class exists");
        setAddressBookEntries([]);
        return;
      }

      const formattedEntries = entries.map((entry) => ({
        id: entry.id,
        name: entry.get("name") || "",
        email: entry.get("email") || "",
        walletAddress: entry.get("walletAddress") || "",
        walletType: entry.get("walletType") || "Unknown",
        isInternal: entry.get("isInternal") || false,
        notes: entry.get("notes") || "",
        tags: entry.get("tags") || "",
        userName: entry.get("user")?.get("username") || "No User",
        userEmail: entry.get("user")?.get("email") || "",
        userId: entry.get("user")?.id || "",
        createdBy: entry.get("createdBy")?.get("username") || "System",
        lastUsed: entry.get("lastUsed") ? entry.get("lastUsed").toISOString().split("T")[0] : "Never",
        createdAt: entry.get("createdAt") ? entry.get("createdAt").toISOString().split("T")[0] : "",
      }));

      console.log(`Fetched ${formattedEntries.length} AddressBook entries`);
      setAddressBookEntries(formattedEntries);
    } catch (error) {
      console.error("Error fetching address book data:", error);
      toast.error("Failed to fetch address book data. Make sure AddressBook class exists in Parse.");
    }
  }, []);

  useEffect(() => {
    fetchAddressBookData();
  }, [fetchAddressBookData, refreshTrigger]);

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const handleDeleteEntry = async (record) => {
    const { name, walletAddress } = record;
    try {
      await toast.promise(ParseClient.deleteRecord("AddressBook", record.id), {
        pending: `Deleting ${name}...`,
        success: `${name} has been successfully deleted.`,
        error: `Failed to delete ${name}. Please try again.`,
      });
      setRefreshTrigger((prev) => !prev);
    } catch (error) {
      console.error("Error deleting address book entry:", error);
    }
  };

  const columns = [
    { label: "Name", name: "name" },
    { label: "Email", name: "email" },
    { label: "Wallet Address", name: "walletAddress", width: "300px" },
    { label: "Type", name: "walletType" },
    { label: "Internal", name: "isInternal", render: (record) => (record.isInternal ? "Yes" : "No") },
    { label: "Associated User", name: "userName" },
    { label: "Tags", name: "tags" },
    { label: "Last Used", name: "lastUsed" },
    { label: "Created By", name: "createdBy" },
    { label: "Created", name: "createdAt" },
  ];

  const actions = [
    { label: "View", name: NomyxAction.ViewAddressBookEntry },
    { label: "Edit", name: NomyxAction.EditAddressBookEntry },
    {
      label: "Delete",
      name: NomyxAction.DeleteAddressBookEntry,
      confirmation: "Are you sure you want to delete this address book entry?",
    },
  ];

  const globalActions = [{ label: "Add Address", name: NomyxAction.CreateAddressBookEntry }];

  const handleAction = async (event, action, record) => {
    switch (action) {
      case NomyxAction.CreateAddressBookEntry:
        toast.info("Create Address Book Entry - To be implemented");
        break;
      case NomyxAction.ViewAddressBookEntry:
        toast.info(`Viewing entry for ${record.name} - To be implemented`);
        break;
      case NomyxAction.EditAddressBookEntry:
        toast.info(`Editing entry for ${record.name} - To be implemented`);
        break;
      case NomyxAction.DeleteAddressBookEntry:
        await handleDeleteEntry(record);
        break;
      default:
        console.log("Action not handled: ", action);
        break;
    }
  };

  return (
    <>
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="Address Book" key="AddressBook">
          <ObjectList
            title="Address Book"
            description="Manage saved wallet addresses for internal and external users"
            columns={columns}
            actions={actions}
            globalActions={globalActions}
            search={true}
            data={addressBookEntries}
            pageSize={10}
            onAction={handleAction}
            onGlobalAction={handleAction}
          />
        </TabPane>
      </Tabs>
    </>
  );
};

export default AddressBookPage;
