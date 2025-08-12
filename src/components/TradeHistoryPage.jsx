import { useState, useEffect, useCallback, useMemo } from "react";

import { Tabs, DatePicker, Input, Button } from "antd";
import Parse from "parse";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList"; // Replace with your actual component

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

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
        console.log("After min amount filter:", filtered.length);
      }
    }

    if (maxAmount.trim()) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        filtered = filtered.filter((trade) => trade.amount <= max);
        console.log("After max amount filter:", filtered.length);
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
      { label: "Name", name: "userName" },
      { label: "Email", name: "userEmail" },
      {
        label: "Wallet Address",
        name: "walletAddress",
        render: (record) => record.source?.address || record.destination?.address || "-",
      },
      {
        label: "Transaction ID",
        name: "requestId",
        render: (record) => record.requestId || "-",
      },
      {
        label: "Time",
        name: "createdAt",
        render: (record) => (record.createdAt ? new Date(record.createdAt).toLocaleString() : "-"),
      },
      {
        label: "Amount",
        name: "amount",
        render: (record) => `$${(record.amount || 0).toFixed(2)}`,
      },
      {
        label: "Status",
        name: "status",
        render: (record) => record.status || "Unknown",
      },
      {
        label: "Chain",
        name: "chain",
        render: (record) => record.chain || "-",
      },
      {
        label: "Currency",
        name: "currency",
        render: (record) => record.currency || "-",
      },
    ],
    []
  );

  return (
    <Tabs activeKey={activeTab} onChange={setActiveTab}>
      <TabPane tab="Trade History" key="TradeHistory">
        {FilterSection}
        <ObjectList
          key={`trades-${trades.length}`}
          title="Trade History"
          description="Complete ledger of all trade transactions"
          columns={columns}
          data={trades}
          pageSize={20}
        />
      </TabPane>
    </Tabs>
  );
};

export default TradeHistoryPage;
