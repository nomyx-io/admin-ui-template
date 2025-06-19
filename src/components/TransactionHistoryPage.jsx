import { useState, useEffect, useCallback, useMemo } from "react";

import { Tabs, DatePicker, Input, Button } from "antd";
import Parse from "parse";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList"; // Replace with your actual component

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const TransactionHistoryPage = (service) => {
  const [rawTransactions, setRawTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("Transactions");

  // Separate state for filters (bound to inputs)
  const [localFilters, setLocalFilters] = useState({
    dateRange: null,
    searchTerm: "",
    minAmount: "",
    maxAmount: "",
  });

  const fetchTransactionData = useCallback(async () => {
    try {
      const transactionRecords = await Parse.Cloud.run("getTransactionHistoryRecords");

      if (!transactionRecords || transactionRecords.length === 0) {
        setRawTransactions([]);
        setTransactions([]);
        return;
      }

      // No need to format again, already done in the cloud function
      setRawTransactions(transactionRecords);
      setTransactions(transactionRecords);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      toast.error("Failed to fetch transaction data.");
    }
  }, []);

  useEffect(() => {
    fetchTransactionData();
  }, [fetchTransactionData]);

  const applyFilters = useCallback(() => {
    const { dateRange, searchTerm, minAmount, maxAmount } = localFilters;
    let filtered = [...rawTransactions];

    console.log("Applying filters:", { dateRange, searchTerm, minAmount, maxAmount });
    console.log("Raw transactions count:", rawTransactions.length);

    if (dateRange?.length === 2) {
      const [start, end] = dateRange;
      filtered = filtered.filter((tx) => {
        const txDate = new Date(tx.timestamp);
        return txDate >= start && txDate <= end;
      });
      console.log("After date filter:", filtered.length);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (tx) =>
          (tx.userName || "").toLowerCase().includes(term) ||
          (tx.userEmail || "").toLowerCase().includes(term) ||
          (tx.transactionHash || "").toLowerCase().includes(term) ||
          (tx.fromAddress || "").toLowerCase().includes(term) ||
          (tx.toAddress || "").toLowerCase().includes(term) ||
          (tx.bridgeTransactionId || "").toLowerCase().includes(term) ||
          (tx.kycInquiryId || "").toLowerCase().includes(term)
      );
      console.log("After search filter:", filtered.length, "Search term:", term);
    }

    if (minAmount.trim()) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) {
        filtered = filtered.filter((tx) => tx.amount / 1_000_000 >= min);
        console.log("After min amount filter:", filtered.length);
      }
    }

    if (maxAmount.trim()) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        filtered = filtered.filter((tx) => tx.amount / 1_000_000 <= max);
        console.log("After max amount filter:", filtered.length);
      }
    }

    console.log("Final filtered count:", filtered.length);
    setTransactions([...filtered]); // Force new array reference
  }, [rawTransactions, localFilters]);

  // Auto-apply filters when localFilters or rawTransactions change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleInputChange = useCallback((key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setLocalFilters({
      dateRange: null,
      searchTerm: "",
      minAmount: "",
      maxAmount: "",
    });
    setTransactions(rawTransactions);
  }, [rawTransactions]);

  // const handleAction = async (event, action, record) => {
  //   switch (action) {
  //     case NomyxAction.ViewTransaction:
  //       toast.info(`Viewing transaction ${record.transactionHash} - To be implemented`);
  //       break;
  //     case NomyxAction.ExportTransaction:
  //       toast.info(`Exporting transaction ${record.transactionHash} - To be implemented`);
  //       break;
  //     case NomyxAction.ExportAllTransactions:
  //       toast.info("Exporting all transactions - To be implemented");
  //       break;
  //     case NomyxAction.ClearFilters:
  //       clearFilters();
  //       toast.success("Filters cleared");
  //       break;
  //     default:
  //       console.log("Action not handled: ", action);
  //       break;
  //   }
  // };

  // Memoize the FilterSection to prevent unnecessary re-renders
  const FilterSection = useMemo(
    () => (
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <RangePicker value={localFilters.dateRange} onChange={(val) => handleInputChange("dateRange", val)} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              value={localFilters.searchTerm}
              placeholder="User, email, hash, address..."
              onChange={(e) => handleInputChange("searchTerm", e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
            <Input type="number" value={localFilters.minAmount} onChange={(e) => handleInputChange("minAmount", e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
            <Input type="number" value={localFilters.maxAmount} onChange={(e) => handleInputChange("maxAmount", e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={clearFilters} className="leading-[10px]">
            Clear Filters
          </Button>
        </div>
      </div>
    ),
    [localFilters, handleInputChange, clearFilters]
  );

  // Memoize columns to prevent re-creation on every render
  const columns = useMemo(
    () => [
      { label: "User", name: "userName" },
      { label: "Email", name: "userEmail" },
      {
        label: "Amount",
        name: "amount",
        render: (record) => `$${(record.amount / 1_000_000).toFixed(2)}`,
      },
      { label: "From", name: "fromAddress" },
      { label: "To", name: "toAddress" },
      //{ label: "Recipient", name: "toUserName" },
      { label: "Fee", name: "fee", render: (record) => `${record.fee}%` },
      {
        label: "Timestamp",
        name: "timestamp",
        render: (record) => (record.timestamp ? new Date(record.timestamp).toLocaleString() : "-"),
      },
      {
        label: "Tx Hash",
        name: "transactionHash",
        render: (record) => (
          <a href={`${process.env.REACT_APP_ETHERSCAN_BASE_URL}${record.transactionHash}`} target="_blank" rel="noopener noreferrer">
            {record.transactionHash}
          </a>
        ),
      },
    ],
    []
  );

  return (
    <Tabs activeKey={activeTab} onChange={setActiveTab}>
      <TabPane tab="Transaction History" key="Transactions">
        {FilterSection}
        <ObjectList
          key={`transactions-${transactions.length}`}
          title="Transaction History"
          description="Complete ledger of all transactions"
          columns={columns}
          data={transactions}
          pageSize={20}
        />
      </TabPane>
    </Tabs>
  );
};

export default TransactionHistoryPage;
