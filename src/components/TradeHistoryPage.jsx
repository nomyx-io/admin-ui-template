import { useState, useEffect, useCallback, useMemo } from "react";

import { DownloadOutlined } from "@ant-design/icons";
import { Tabs, DatePicker, Input, Button } from "antd";
import Parse from "parse";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

// Referred By Button Component
const ReferredByButton = ({ referredByName, referredByEmail }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!referredByName && !referredByEmail) {
    return <span className="text-gray-500">-</span>;
  }

  return (
    <div className="relative inline-block">
      <button
        className="border border-[#7f56d9] hover:bg-[#7f56d9] text-[#7f56d9] hover:text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        User Info
      </button>
      {showTooltip && (
        <div className="absolute z-50 left-0 top-full mt-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg p-3 min-w-max">
          <div className="space-y-1">
            {referredByName && (
              <div className="whitespace-nowrap">
                <span className="font-medium">Name:</span> {referredByName}
              </div>
            )}
            {referredByEmail && (
              <div className="whitespace-nowrap">
                <span className="font-medium">Email:</span> {referredByEmail}
              </div>
            )}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-800 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

const TradeHistoryPage = (service) => {
  const [rawTrades, setRawTrades] = useState([]);
  const [trades, setTrades] = useState([]);
  const [activeTab, setActiveTab] = useState("TradeHistory");

  const [localFilters, setLocalFilters] = useState({
    dateRange: null,
    searchTerm: "",
    minAmount: "",
    maxAmount: "",
  });

  const fetchTradeData = useCallback(async () => {
    try {
      const tradeRecords = await Parse.Cloud.run("getTradeHistory");

      if (!tradeRecords || tradeRecords.length === 0) {
        setRawTrades([]);
        setTrades([]);
        return;
      }

      setRawTrades(tradeRecords);
      setTrades(tradeRecords);
    } catch (error) {
      console.error("Error fetching trade data:", error);
      toast.error("Failed to fetch trade data.");
    }
  }, []);

  useEffect(() => {
    fetchTradeData();
  }, [fetchTradeData]);

  const applyFilters = useCallback(() => {
    const { dateRange, searchTerm, minAmount, maxAmount } = localFilters;
    let filtered = [...rawTrades];

    if (dateRange?.length === 2) {
      const [start, end] = dateRange;
      filtered = filtered.filter((trade) => {
        const tradeDate = new Date(trade.createdAt);
        return tradeDate >= start && tradeDate <= end;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (trade) =>
          (trade.userName || "").toLowerCase().includes(term) ||
          (trade.userEmail || "").toLowerCase().includes(term) ||
          (trade.requestId || "").toLowerCase().includes(term) ||
          (trade.source?.address || "").toLowerCase().includes(term) ||
          (trade.destination?.address || "").toLowerCase().includes(term) ||
          (trade.onrampId || "").toLowerCase().includes(term)
      );
    }

    if (minAmount.trim()) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) {
        filtered = filtered.filter((trade) => trade.amount >= min);
      }
    }

    if (maxAmount.trim()) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        filtered = filtered.filter((trade) => trade.amount <= max);
      }
    }

    setTrades([...filtered]);
  }, [rawTrades, localFilters]);

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
    setTrades(rawTrades);
  }, [rawTrades]);

  // CSV Export Function
  const exportToCSV = useCallback(() => {
    if (!trades || trades.length === 0) {
      toast.warning("No data to export");
      return;
    }

    try {
      // Define CSV headers
      const headers = [
        "Name",
        "Email",
        "Wallet Address",
        "Transaction ID",
        "Time",
        "Status",
        "Referred By Name",
        "Referred By Email",
        "Amount",
        "Source Currency",
        "Destination Currency",
      ];

      // Convert data to CSV rows
      const csvRows = trades.map((trade) => {
        const walletAddress = trade.destination?.walletAddress || trade?.transferDetails?.source?.walletAddress || "-";
        const transactionId = trade?.hifiTransferId || trade?.requestId || "-";
        const timestamp = trade.createdAt ? new Date(trade.createdAt).toLocaleString() : "-";
        const amount = `$${(trade.amount || 0).toFixed(2)}`;
        const sourceCurrency = trade.source?.currency?.toUpperCase() || "-";
        const destinationCurrency = trade.destination?.currency?.toUpperCase() || "-";

        return [
          trade.userName || "",
          trade.userEmail || "",
          walletAddress,
          transactionId,
          timestamp,
          trade.status || "Unknown",
          trade.referredByName || "",
          trade.referredByEmail || "",
          amount,
          sourceCurrency,
          destinationCurrency,
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
      link.setAttribute("download", `trade_history_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      toast.success(`Exported ${trades.length} trade${trades.length !== 1 ? "s" : ""} to CSV`);
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error("Failed to export data to CSV");
    }
  }, [trades]);

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
              placeholder="User, email, request ID, address..."
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
            Showing {trades.length} of {rawTrades.length} trade{rawTrades.length !== 1 ? "s" : ""}
          </div>
          <div className="flex gap-2">
            <Button onClick={clearFilters} className="leading-[10px]">
              Clear Filters
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={exportToCSV} disabled={trades.length === 0} className="leading-[10px]">
              Export to CSV
            </Button>
          </div>
        </div>
      </div>
    ),
    [localFilters, handleInputChange, clearFilters, exportToCSV, trades.length, rawTrades.length]
  );

  const columns = useMemo(
    () => [
      { label: "Name", name: "userName", width: 150 },
      { label: "Email", name: "userEmail", width: 200 },
      {
        label: "Wallet Address",
        name: "walletAddress",
        width: 180,
        render: (record) => record.destination?.walletAddress || record?.transferDetails?.source?.walletAddress || "-",
      },
      {
        label: "Transaction ID",
        name: "requestId",
        width: 150,
        render: (record) => record?.hifiTransferId || record?.requestId || "-",
      },
      {
        label: "Time",
        name: "createdAt",
        width: 150,
        render: (record) => (record.createdAt ? new Date(record.createdAt).toLocaleString() : "-"),
      },
      {
        label: "Status",
        name: "status",
        width: 120,
        render: (record) => record.status || "Unknown",
      },
      {
        label: "Referred By",
        name: "referredBy",
        width: 130,
        render: (record) => {
          if (!record.referredByName && !record.referredByEmail) {
            return "-";
          } else {
            return <ReferredByButton referredByName={record.referredByName} referredByEmail={record.referredByEmail} />;
          }
        },
      },
      {
        label: "Amount",
        name: "amount",
        width: 120,
        render: (record) => `$${(record.amount || 0).toFixed(2)}`,
      },
      {
        label: "Source Currency",
        name: "currency",
        width: 140,
        render: (record) => record.source?.currency?.toUpperCase() || "-",
      },
      {
        label: "Destination Currency",
        name: "currency",
        width: 160,
        render: (record) => record.destination?.currency?.toUpperCase() || "-",
      },
    ],
    []
  );

  return (
    <Tabs activeKey={activeTab} onChange={setActiveTab}>
      <TabPane tab="Trade History" key="TradeHistory">
        {FilterSection}
        <div className="overflow-x-auto">
          <ObjectList
            key={`trades-${trades.length}`}
            title="Trade History"
            description="Complete ledger of all trade transactions"
            columns={columns}
            data={trades}
            pageSize={20}
          />
        </div>
      </TabPane>
    </Tabs>
  );
};

export default TradeHistoryPage;
