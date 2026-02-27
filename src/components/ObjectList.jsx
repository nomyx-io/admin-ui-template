import "./ObjectList.css";

import { useState, useEffect } from "react";

import ReactPaginate from "react-paginate";

import { WarningIcon } from "../assets/icons";
import { getValue, recursiveSearch } from "../utils";
import { NomyxAction } from "../utils/Constants";

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

const ObjectList = ({
  title,
  description,
  tabs,
  columns,
  actions,
  globalActions,
  search,
  data,
  pageSize = 10,
  onAction,
  loading = false,
  hasMore = false,
  onLoadMore = null,
  totalCount = 0,
  useServerPagination = false,
  currentPage = 1,
  onPageChange = null,
  searchTerm = "",
  onSearch = null,
}) => {
  const [pageData, setPageData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [itemOffset, setItemOffset] = useState(0);
  const [activeTab, setActiveTab] = useState(tabs ? tabs[0].id : null);
  const [searchText, setSearchText] = useState(searchTerm);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Update local search text when external searchTerm changes (e.g., tab change)
  useEffect(() => {
    setSearchText(searchTerm);
  }, [searchTerm]);

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

  const handleTabClick = (tab) => {
    setActiveTab(tab.id);
  };

  const handleSearch = (text) => {
    setSearchText(text);

    if (useServerPagination) {
      // Server-side search - notify parent
      if (onSearch) {
        onSearch(text);
      }
    } else {
      // Client-side search
      let filtered = data.filter((item) => recursiveSearch(item, text));
      setItemOffset(0);
      setFilteredData(filtered);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setDialogContent(null);
  };

  const handlePageClick = (event) => {
    if (useServerPagination) {
      // Server-side pagination - notify parent to fetch new page
      if (onPageChange) {
        onPageChange(event.selected + 1); // react-paginate uses 0-based index
      }
    } else {
      // Client-side pagination
      const newOffset = (event.selected * pageSize) % filteredData.length;
      setItemOffset(newOffset);
    }
  };

  useEffect(() => {
    if (!searchText && data && data.length > 0) setFilteredData(data);

    if (useServerPagination) {
      // For server-side pagination, show current page data
      setPageData(data);
      setPageCount(Math.ceil(totalCount / pageSize));
    } else {
      // Client-side pagination
      const endOffset = itemOffset + pageSize;
      let paginatedData = filteredData.slice(itemOffset, endOffset);
      setPageData(paginatedData);
      setPageCount(Math.ceil(filteredData.length / pageSize));
    }
  }, [itemOffset, pageSize, showDialog, data, filteredData, searchText, useServerPagination, totalCount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container">
      {tabs && (
        <div className="tabs">
          {tabs.map((tab) => {
            return (
              <button
                key={tab.id}
                className={tab.id === activeTab ? "active" : ""}
                onClick={() => handleTabClick(tab)}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}
              >
                {tab.name}
              </button>
            );
          })}
        </div>
      )}

      <header className="table-header">
        <h1>{title}</h1>
        <h2>{description ? description : "A list of your " + title}</h2>
        <section className="controls">
          {search && (
            <div className="search">
              <input type="text" placeholder="Search..." value={searchText} onChange={(e) => handleSearch(e.target.value)} />
            </div>
          )}

          {globalActions && (
            <div className="global-actions">
              {globalActions.map((globalAction) => {
                return (
                  <button
                    key={globalAction.name}
                    className={"btn global-action-" + globalAction.name}
                    data-tour={
                      globalAction.name === NomyxAction.CreateClaimTopic
                        ? "create-compliance-rule-btn"
                        : globalAction.name === NomyxAction.CreateTrustedIssuer
                          ? "create-trusted-issuer-btn"
                          : globalAction.name === NomyxAction.CreatePendingIdentity
                            ? "identities-approve-btn"
                            : globalAction.name === NomyxAction.AddClaims
                              ? "identities-add-rules-btn"
                              : globalAction.name === NomyxAction.CreateIdentity
                                ? "create-identity-btn"
                                : undefined
                    }
                    onClick={(event) => handleAction(event, globalAction.name, globalAction.confirmation)}
                  >
                    {globalAction.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </header>

      {useServerPagination && totalCount > 0 && (
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
                    {actions.map((action) => {
                      return (
                        <button
                          key={record.id + "-action-" + action.name}
                          onClick={(event) => handleAction(event, action.name, action.confirmation, record)}
                          style={{
                            marginRight: "1rem",
                            color: "var(--link-color)",
                            transition: "0.5s all",
                            lineHeight: "0.2",
                          }}
                        >
                          {action.label}
                        </button>
                      );
                    })}
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
          forcePage={useServerPagination ? currentPage - 1 : undefined}
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

export default ObjectList;
