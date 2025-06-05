import { useState, useEffect, useCallback } from "react";

import { Tabs, DatePicker, Select, Input } from "antd";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";
import ParseClient from "../services/ParseClient";
import { NomyxAction } from "../utils/Constants";

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const TransactionHistoryPage = ({ service }) => {
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("Transactions");
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: null,
    transactionType: "",
    status: "",
    minAmount: "",
    maxAmount: "",
    searchTerm: "",
  });

  const fetchTransactionData = useCallback(async () => {
    try {
      // Fetch transactions from Parse
      const transactionRecords = await ParseClient.getRecords(
        "TransactionHistory",
        [], // No where conditions initially - we'll apply filters separately
        [],
        ["user", "toUser"], // Include user pointers
        1000,
        0,
        "timestamp",
        "desc"
      );

      if (!transactionRecords) {
        console.log("No TransactionHistory records found - make sure the Parse class exists");
        setTransactions([]);
        return;
      }

      let formattedTransactions = transactionRecords.map((transaction) => ({
        id: transaction.id,
        amount: transaction.get("amount") || 0,
        token: transaction.get("token") || "ETH",
        timestamp: transaction.get("timestamp")
          ? transaction.get("timestamp").toISOString().split("T")[0] + " " + transaction.get("timestamp").toISOString().split("T")[1].split(".")[0]
          : "",
        transactionHash: transaction.get("transactionHash") || "",
        fromAddress: transaction.get("fromAddress") || "",
        toAddress: transaction.get("toAddress") || "",
        status: transaction.get("status") || "Unknown",
        transactionType: transaction.get("transactionType") || "Transfer",
        fee: transaction.get("fee") || 0,
        userName: transaction.get("user")?.get("username") || "Unknown User",
        userEmail: transaction.get("user")?.get("email") || "",
        toUserName: transaction.get("toUser")?.get("username") || "External",
        bridgeTransactionId: transaction.get("bridgeTransactionId") || "",
        kycInquiryId: transaction.get("kycInquiryId") || "",
        gasUsed: transaction.get("gasUsed") || 0,
        gasPrice: transaction.get("gasPrice") || "0",
        blockNumber: transaction.get("blockNumber") || 0,
        networkId: transaction.get("networkId") || "",
        userId: transaction.get("user")?.id || "",
      }));

      // Apply filters
      if (filters.dateRange && filters.dateRange.length === 2) {
        const [startDate, endDate] = filters.dateRange;
        formattedTransactions = formattedTransactions.filter((tx) => {
          const txDate = new Date(tx.timestamp);
          return txDate >= startDate && txDate <= endDate;
        });
      }

      if (filters.transactionType) {
        formattedTransactions = formattedTransactions.filter((tx) => tx.transactionType === filters.transactionType);
      }

      if (filters.status) {
        formattedTransactions = formattedTransactions.filter((tx) => tx.status === filters.status);
      }

      if (filters.minAmount) {
        formattedTransactions = formattedTransactions.filter((tx) => tx.amount >= parseFloat(filters.minAmount));
      }

      if (filters.maxAmount) {
        formattedTransactions = formattedTransactions.filter((tx) => tx.amount <= parseFloat(filters.maxAmount));
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        formattedTransactions = formattedTransactions.filter(
          (tx) =>
            tx.userName.toLowerCase().includes(searchLower) ||
            tx.userEmail.toLowerCase().includes(searchLower) ||
            tx.transactionHash.toLowerCase().includes(searchLower) ||
            tx.fromAddress.toLowerCase().includes(searchLower) ||
            tx.toAddress.toLowerCase().includes(searchLower) ||
            tx.bridgeTransactionId.toLowerCase().includes(searchLower) ||
            tx.kycInquiryId.toLowerCase().includes(searchLower)
        );
      }

      console.log(`Fetched and filtered ${formattedTransactions.length} transactions`);
      setTransactions(formattedTransactions);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      toast.error("Failed to fetch transaction data. Make sure TransactionHistory class exists in Parse.");
    }
  }, [filters]);

  useEffect(() => {
    fetchTransactionData();
  }, [fetchTransactionData, refreshTrigger]);

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      dateRange: null,
      transactionType: "",
      status: "",
      minAmount: "",
      maxAmount: "",
      searchTerm: "",
    });
  };

  const columns = [
    { label: "User", name: "userName" },
    { label: "Email", name: "userEmail" },
    { label: "Amount", name: "amount", render: (record) => `${record.amount} ${record.token}` },
    { label: "Type", name: "transactionType" },
    { label: "Status", name: "status" },
    { label: "From", name: "fromAddress", width: "200px" },
    { label: "To", name: "toAddress", width: "200px" },
    { label: "Recipient", name: "toUserName" },
    { label: "Fee", name: "fee", render: (record) => `${record.fee} ${record.token}` },
    { label: "Timestamp", name: "timestamp" },
    { label: "Tx Hash", name: "transactionHash", width: "150px" },
    { label: "Bridge ID", name: "bridgeTransactionId" },
    { label: "KYC ID", name: "kycInquiryId" },
  ];

  const actions = [
    { label: "View Details", name: NomyxAction.ViewTransaction },
    { label: "Export", name: NomyxAction.ExportTransaction },
  ];

  const globalActions = [
    { label: "Export All", name: NomyxAction.ExportAllTransactions },
    { label: "Clear Filters", name: NomyxAction.ClearFilters },
  ];

  const handleAction = async (event, action, record) => {
    switch (action) {
      case NomyxAction.ViewTransaction:
        toast.info(`Viewing transaction ${record.transactionHash} - To be implemented`);
        break;
      case NomyxAction.ExportTransaction:
        toast.info(`Exporting transaction ${record.transactionHash} - To be implemented`);
        break;
      case NomyxAction.ExportAllTransactions:
        toast.info("Exporting all transactions - To be implemented");
        break;
      case NomyxAction.ClearFilters:
        clearFilters();
        toast.success("Filters cleared");
        break;
      default:
        console.log("Action not handled: ", action);
        break;
    }
  };

  const FilterSection = () => (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
          <RangePicker value={filters.dateRange} onChange={(dates) => handleFilterChange("dateRange", dates)} className="w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
          <Select
            value={filters.transactionType}
            onChange={(value) => handleFilterChange("transactionType", value)}
            className="w-full"
            allowClear
            placeholder="Select type"
          >
            <Option value="Transfer">Transfer</Option>
            <Option value="On-Ramp">On-Ramp</Option>
            <Option value="Off-Ramp">Off-Ramp</Option>
            <Option value="Swap">Swap</Option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Select
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
            className="w-full"
            allowClear
            placeholder="Select status"
          >
            <Option value="Completed">Completed</Option>
            <Option value="Pending">Pending</Option>
            <Option value="Failed">Failed</Option>
            <Option value="Cancelled">Cancelled</Option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <Input
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
            placeholder="User, email, hash, address..."
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
          <Input
            type="number"
            value={filters.minAmount}
            onChange={(e) => handleFilterChange("minAmount", e.target.value)}
            placeholder="0.0"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
          <Input
            type="number"
            value={filters.maxAmount}
            onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
            placeholder="1000.0"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="Transaction History" key="Transactions">
          <div>
            <FilterSection />
            <ObjectList
              title="Transaction History"
              description="Complete ledger of all transactions with filtering capabilities"
              columns={columns}
              actions={actions}
              globalActions={globalActions}
              search={false} // We have custom search in filters
              data={transactions}
              pageSize={20}
              onAction={handleAction}
              onGlobalAction={handleAction}
            />
          </div>
        </TabPane>
      </Tabs>
    </>
  );
};

export default TransactionHistoryPage;
