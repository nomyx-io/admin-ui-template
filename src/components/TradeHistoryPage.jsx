import { useState, useEffect, useCallback, useMemo } from "react";

import { Tabs, DatePicker, Input, Button } from "antd";
import Parse from "parse";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList"; // Replace with your actual component

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

  // Separate state for filters (bound to inputs)
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

      // No need to format again, already done in the cloud function
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

    console.log("Applying filters:", { dateRange, searchTerm, minAmount, maxAmount });
    console.log("Raw trades count:", rawTrades.length);

    if (dateRange?.length === 2) {
      const [start, end] = dateRange;
      filtered = filtered.filter((trade) => {
        const tradeDate = new Date(trade.createdAt);
        return tradeDate >= start && tradeDate <= end;
      });
      console.log("After date filter:", filtered.length);
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
      console.log("After search filter:", filtered.length, "Search term:", term);
    }

    if (minAmount.trim()) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) {
        filtered = filtered.filter((trade) => trade.amount >= min);
        console.log("After minimum amount filter:", filtered.length);
      }
    }

    if (maxAmount.trim()) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        filtered = filtered.filter((trade) => trade.amount <= max);
        console.log("After maximum amount filter:", filtered.length);
      }
    }

    console.log("Final filtered count:", filtered.length);
    setTrades([...filtered]); // Force new array reference
  }, [rawTrades, localFilters]);

  // Auto-apply filters when localFilters or rawTrades change
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
        {/* Add horizontal scrolling wrapper */}
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
