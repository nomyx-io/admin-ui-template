import { useState, useEffect, useCallback, useMemo } from "react";

import { DownloadOutlined } from "@ant-design/icons";
import { Tabs, DatePicker, Input, Button, Tag } from "antd";
import Parse from "parse";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const TransactionHistoryPage = (service) => {
  const [rawTransactions, setRawTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("Transactions");

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

    if (dateRange?.length === 2) {
      const [start, end] = dateRange;
      filtered = filtered.filter((tx) => {
        const txDate = new Date(tx.timestamp);
        return txDate >= start && txDate <= end;
      });
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
    }

    if (minAmount.trim()) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) {
        filtered = filtered.filter((tx) => tx.amount / 1_000_000 >= min);
      }
    }

    if (maxAmount.trim()) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        filtered = filtered.filter((tx) => tx.amount / 1_000_000 <= max);
      }
    }

    setTransactions([...filtered]);
  }, [rawTransactions, localFilters]);

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

  const getTokenName = (tokenAddress) => {
    if (!tokenAddress) return "ETH";

    const address = tokenAddress.toLowerCase();

    if (address === process.env.REACT_APP_HARDHAT_USDC_ADDRESS?.toLowerCase()) {
      return "USDC";
    }
    if (address === process.env.REACT_APP_HARDHAT_USDT_ADDRESS?.toLowerCase()) {
      return "USDT";
    }

    return `${tokenAddress.slice(0, 6)}...`;
  };

  const getTokenColor = (tokenName) => {
    switch (tokenName) {
      case "USDC":
        return "blue";
      case "USDT":
        return "green";
      case "ETH":
        return "gray";
      default:
        return "default";
    }
  };

  // CSV Export Function
  const exportToCSV = useCallback(() => {
    if (!transactions || transactions.length === 0) {
      toast.warning("No data to export");
      return;
    }

    try {
      // Define CSV headers
      const headers = [
        "User",
        "Email",
        "Amount",
        "Token",
        "From Address",
        "To Address",
        "Transaction Hash",
        "Timestamp",
        "Bridge Transaction ID",
        "KYC Inquiry ID",
      ];

      // Convert data to CSV rows
      const csvRows = transactions.map((tx) => {
        const tokenName = getTokenName(tx.token);
        const amount = (tx.amount / 1_000_000).toFixed(2);
        const timestamp = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "-";

        return [
          tx.userName || "",
          tx.userEmail || "",
          amount,
          tokenName,
          tx.fromAddress || "",
          tx.toAddress || "",
          tx.transactionHash || "",
          timestamp,
          tx.bridgeTransactionId || "",
          tx.kycInquiryId || "",
        ]
          .map((field) => {
            // Escape fields containing commas, quotes, or newlines
            const fieldStr = String(field);
            if (fieldStr.includes(",") || fieldStr.includes('"') || fieldStr.includes("\n")) {
              return `"${fieldStr.replace(/"/g, '""')}"`;
            }
            return fieldStr;
          })
          .join(",");
      });

      // Combine headers and rows
      const csvContent = [headers.join(","), ...csvRows].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `transactions_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      toast.success(`Exported ${transactions.length} transaction${transactions.length !== 1 ? "s" : ""} to CSV`);
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error("Failed to export data to CSV");
    }
  }, [transactions, getTokenName]);

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Amount</label>
            <Input type="number" value={localFilters.minAmount} onChange={(e) => handleInputChange("minAmount", e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Amount</label>
            <Input type="number" value={localFilters.maxAmount} onChange={(e) => handleInputChange("maxAmount", e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {transactions.length} of {rawTransactions.length} transaction{rawTransactions.length !== 1 ? "s" : ""}
          </div>
          <div className="flex gap-2">
            <Button onClick={clearFilters} className="leading-[10px]">
              Clear Filters
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={exportToCSV} disabled={transactions.length === 0} className="leading-[10px]">
              Export to CSV
            </Button>
          </div>
        </div>
      </div>
    ),
    [localFilters, handleInputChange, clearFilters, exportToCSV, transactions.length, rawTransactions.length]
  );

  const columns = useMemo(
    () => [
      { label: "User", name: "userName" },
      { label: "Email", name: "userEmail" },
      {
        label: "Amount",
        name: "amount",
        render: (record) => `${(record.amount / 1_000_000).toFixed(2)}`,
      },
      { label: "From", name: "fromAddress" },
      { label: "To", name: "toAddress" },
      {
        label: "Token",
        name: "token",
        render: (record) => {
          const tokenName = getTokenName(record.token);
          return (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Tag color={getTokenColor(tokenName)}>{tokenName}</Tag>
            </div>
          );
        },
      },
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
    [getTokenColor]
  );

  return (
    <Tabs activeKey={activeTab} onChange={setActiveTab}>
      <TabPane tab="Transfer History" key="Transactions">
        {FilterSection}
        <ObjectList
          key={`transactions-${transactions.length}`}
          title="Transfer History"
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
