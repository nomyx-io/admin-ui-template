import "./ObjectList.css";

import { useState, useEffect } from "react";

import { SearchOutlined } from "@ant-design/icons";
import { Button, Select, Space, Input, Tooltip } from "antd";
import ReactPaginate from "react-paginate";

import { WarningIcon } from "../assets/icons";
import { getValue } from "../utils";

const { Option } = Select;

export const ConfirmationDialog = ({ message, onConfirm, onCancel }) => {
  const handleConfirm = (event) => {
    onConfirm({ event });
  };

  const handleCancel = (event) => {
    onCancel(event);
  };

  return (
    <>
      <h1>Are you sure?</h1>
      <p>{message}</p>
      <div className="dialog-buttons">
        <button className="btn cancel" onClick={(event) => handleCancel(event)}>
          Cancel
        </button>
        <button className="btn" onClick={(event) => handleConfirm(event)}>
          Continue
        </button>
      </div>
    </>
  );
};

const PendingIdentitiesObjectList = ({
  title,
  description,
  columns,
  actions,
  globalActions,
  data,
  pageSize = 10,
  onAction,
  onGlobalAction,
  loading = false,
  hasMore = false,
  totalCount = 0,
  currentPage = 1,
  onFilterChange,
}) => {
  const [pageData, setPageData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [tempSearchTerm, setTempSearchTerm] = useState("");
  const [tempFilter, setTempFilter] = useState("all");
  const [pageCount, setPageCount] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleViewResults = () => {
    setSearchTerm(tempSearchTerm);
    setSelectedFilter(tempFilter);
    onFilterChange(tempSearchTerm, tempFilter, 1);
  };

  const handleFilterChange = (value) => {
    setTempFilter(value);
  };

  const handleSearchInputChange = (e) => {
    setTempSearchTerm(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleViewResults();
    }
  };

  const handleAction = (event, action, confirm, object) => {
    event.preventDefault();

    if (confirm) {
      const handleConfirm = (event) => {
        onAction(event, action, object);
        setShowDialog(false);
        setDialogContent(null);
      };

      setShowDialog(true);
      setDialogContent(
        <ConfirmationDialog title={title} message={confirm} onConfirm={(event) => handleConfirm(event)} onCancel={(event) => handleCancel(event)} />
      );
    } else if (onAction) {
      onAction(event, action, object);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setDialogContent(null);
  };

  const handlePageClick = (event) => {
    onFilterChange(searchTerm, selectedFilter, event.selected + 1);
  };

  const handleGlobalActionClick = (event, actionName, confirmation) => {
    if (confirmation) {
      const handleConfirm = (event) => {
        onGlobalAction(event, actionName);
        setShowDialog(false);
        setDialogContent(null);
      };

      setShowDialog(true);
      setDialogContent(
        <ConfirmationDialog
          title={title}
          message={confirmation}
          onConfirm={(event) => handleConfirm(event)}
          onCancel={(event) => handleCancel(event)}
        />
      );
    } else if (onGlobalAction) {
      onGlobalAction(event, actionName);
    }
  };

  useEffect(() => {
    setPageData(data);
    setPageCount(Math.ceil(totalCount / pageSize));
  }, [data, totalCount, pageSize, showDialog]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container">
      <header className="table-header">
        <h1>{title}</h1>
        <h2>{description ? description : "A list of your " + title}</h2>
        <section className="controls">
          {/* Custom Filter Controls */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <Select value={tempFilter} onChange={handleFilterChange} style={{ width: 280 }} placeholder="Select filter">
              <Option value="all">All Pending Users</Option>
              <Option value="kyc_wallet">KYC + Wallet Completed</Option>
              <Option value="kyc_only">KYC Only (Wallet Incomplete)</Option>
              <Option value="email_only">Email Verified Only</Option>
            </Select>

            <Input
              placeholder="Search by name, email, address, or KYC ID"
              value={tempSearchTerm}
              onChange={handleSearchInputChange}
              onKeyPress={handleKeyPress}
              style={{ width: 500 }}
              prefix={<SearchOutlined />}
              allowClear
            />

            <Button type="primary" onClick={handleViewResults} loading={loading} className="mr-11 leading-[1px]">
              View Results
            </Button>
          </div>

          {globalActions && (
            <div className="global-actions" style={{ marginLeft: "auto" }}>
              {globalActions.map((globalAction) => {
                return (
                  <button
                    key={globalAction.name}
                    className={"btn global-action-" + globalAction.name}
                    onClick={(event) => handleGlobalActionClick(event, globalAction.name, globalAction.confirmation)}
                  >
                    {globalAction.icon ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {globalAction.icon}
                        {globalAction.label}
                      </span>
                    ) : (
                      globalAction.label
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </header>

      {totalCount > 0 && (
        <div style={{ padding: "0.5rem 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
          {title.toLowerCase()}
        </div>
      )}

      <table>
        <thead>
          <tr>
            {columns.map((column) => {
              let fieldName = column;
              let label = column;
              let style = {};

              if (typeof column === "object") {
                fieldName = column.name;
                label = column.label;
                style = column.width ? { width: column.width } : {};
              }

              return (
                <th key={fieldName} style={style}>
                  {label}
                </th>
              );
            })}
            {actions && actions.length > 0 && <th key={title + "-actions"}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {pageData.map((record) => {
            return (
              <tr key={record.id}>
                {columns.map((column) => {
                  let fieldName = typeof column === "object" ? column.name : column;
                  let key = fieldName + "-" + record.id;
                  if (column.name !== "flagged_account")
                    return <td key={key}>{column.render ? <>{column.render(record)}</> : <>{getValue(fieldName, record)}</>}</td>;
                  else
                    return (
                      <td key={key}>
                        {record.watchlistMatched && (
                          <div className="w-7 text-red-700">
                            <WarningIcon />
                          </div>
                        )}
                        {record.pepMatched && (
                          <div className="w-7 text-red-700">
                            <WarningIcon />
                          </div>
                        )}
                      </td>
                    );
                })}
                {actions && actions.length > 0 && (
                  <td key={"actions" + record.id}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      {actions.map((action) => {
                        const buttonContent = (
                          <button
                            key={record.id + "-action-" + action.name}
                            onClick={(event) => handleAction(event, action.name, action.confirmation, record)}
                            style={{
                              color: "var(--link-color)",
                              transition: "0.5s all",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0.25rem",
                              display: "inline-flex",
                              alignItems: "center",
                              fontSize: "16px",
                            }}
                            aria-label={action.label}
                          >
                            {action.icon || action.label}
                          </button>
                        );

                        return action.icon ? (
                          <Tooltip key={record.id + "-action-" + action.name} title={action.label} placement="top">
                            {buttonContent}
                          </Tooltip>
                        ) : (
                          buttonContent
                        );
                      })}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {pageData.length === 0 && (isLoading || loading) && (
        <div className="empty">
          <p>Loading {title}...</p>
        </div>
      )}

      {pageData.length === 0 && !isLoading && !loading && (
        <div className="empty">
          <p>No {title.toLowerCase()} found.</p>
        </div>
      )}

      <div className="pagination">
        <ReactPaginate
          breakLabel="&#8230;"
          previousLabel="&#9664;"
          nextLabel="&#9658;"
          onPageChange={handlePageClick}
          pageRangeDisplayed={5}
          pageCount={pageCount}
          renderOnZeroPageCount={null}
          forcePage={currentPage - 1}
        />
      </div>

      {showDialog && (
        <div className="dialog">
          <div className="dialog-content">{dialogContent}</div>
        </div>
      )}
    </div>
  );
};

export default PendingIdentitiesObjectList;
