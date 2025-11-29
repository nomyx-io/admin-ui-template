import "./ObjectList.css";
import { useState, useEffect } from "react";

import ReactPaginate from "react-paginate";

import { WarningIcon } from "../assets/icons";
import { getValue, recursiveSearch } from "../utils";

export const ConfirmationDialog = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="p-4 dialog-content bg-white rounded-lg">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Are you sure?</h3>
      <p className="text-[var(--text-secondary)] mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 font-medium transition-colors" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="px-4 py-2 rounded-md bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)] font-medium transition-colors shadow-sm"
          onClick={onConfirm}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const TableSkeleton = ({ columns }) => (
  <div className="animate-pulse w-full">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex border-b border-gray-100 py-4 px-6">
        {columns.map((_, j) => (
          <div key={j} className="flex-1 mr-4">
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const ObjectList = ({ title, description, tabs, columns, actions, globalActions, search, data, pageSize = 10, onAction }) => {
  const [pageData, setPageData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [itemOffset, setItemOffset] = useState(0);
  const [activeTab, setActiveTab] = useState(tabs ? tabs[0].id : null);
  const [searchText, setSearchText] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAction = (event, action, confirm, object) => {
    event.preventDefault();

    if (confirm) {
      const handleConfirm = (event) => {
        onAction(event, action, object);
        setShowDialog(false);
        setDialogContent(null);
      };

      setShowDialog(true);
      setDialogContent(<ConfirmationDialog message={confirm} onConfirm={(event) => handleConfirm(event)} onCancel={() => setShowDialog(false)} />);
    } else if (onAction) {
      onAction(event, action, object);
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab.id);
  };

  const handleSearch = (text) => {
    setSearchText(text);
    let filteredData = data.filter((item) => recursiveSearch(item, text));
    setItemOffset(0);
    setFilteredData(filteredData);
  };

  const handlePageClick = (event) => {
    const newOffset = (event.selected * pageSize) % data.length;
    setItemOffset(newOffset);
  };

  useEffect(() => {
    if (!searchText && data && data.length > 0) setFilteredData(data);
    const endOffset = itemOffset + pageSize;
    let pageData = filteredData.slice(itemOffset, endOffset);
    setPageData(pageData);
    setPageCount(Math.ceil(filteredData.length / pageSize));
  }, [itemOffset, pageSize, showDialog, data, filteredData, searchText]);

  useEffect(() => {
    // Simulate loading delay for skeleton demo (remove in prod if data is instant)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="modern-card object-list-container p-6 bg-white animate-fade-in-up">
      {tabs && (
        <div className="flex border-b border-gray-100 mb-6">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  isActive ? "text-[var(--color-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--color-primary)]"
                }`}
                onClick={() => handleTabClick(tab)}
              >
                {tab.name}
                {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-accent)] rounded-t-full"></div>}
              </button>
            );
          })}
        </div>
      )}

      <header className="object-list-header">
        <div className="object-list-title">
          <h1>{title}</h1>
          <h2>{description ? description : "A list of your " + title}</h2>
        </div>

        <section className="object-list-controls">
          {search && (
            <div className="search-input-wrapper input-glow rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="search-icon">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <input type="text" placeholder="Search..." className="search-input border-none" onKeyUp={(e) => handleSearch(e.target.value)} />
            </div>
          )}

          {globalActions && (
            <div className="flex gap-3">
              {globalActions.map((globalAction) => {
                return (
                  <button
                    key={globalAction.name}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-light)] transition-all hover:shadow-lg hover:-translate-y-0.5 text-sm font-medium flex items-center gap-2 shadow-sm"
                    onClick={(event) => handleAction(event, globalAction.name, globalAction.confirmation)}
                    {...globalAction.props}
                  >
                    {globalAction.icon && <span>{globalAction.icon}</span>}
                    {globalAction.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </header>

      <div className="table-wrapper min-h-[300px]">
        {isLoading ? (
          <TableSkeleton columns={columns} />
        ) : (
          <table className="modern-table">
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
                {actions && actions.length > 0 && (
                  <th key={title + "-actions"} className="text-right pr-6">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {pageData.map((record) => {
                return (
                  <tr key={record.id} className="group">
                    {columns.map((column) => {
                      let fieldName = typeof column === "object" ? column.name : column;
                      let key = fieldName + "-" + record.id;
                      if (column.name !== "flagged_account")
                        return <td key={key}>{column.render ? <>{column.render(record)}</> : <>{getValue(fieldName, record)}</>}</td>;
                      else
                        return (
                          <td key={key}>
                            {record.watchlistMatched && (
                              <div className="w-5 text-red-600">
                                <WarningIcon />
                              </div>
                            )}
                            {record.pepMatched && (
                              <div className="w-5 text-red-600">
                                <WarningIcon />
                              </div>
                            )}
                          </td>
                        );
                    })}
                    {actions && actions.length > 0 && (
                      <td key={"actions" + record.id} className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {actions.map((action) => {
                            return (
                              <button
                                key={record.id + "-action-" + action.name}
                                onClick={(event) => handleAction(event, action.name, action.confirmation, record)}
                                className="px-3 py-1.5 rounded text-sm font-medium bg-white hover:bg-[var(--color-accent)] hover:text-white transition-all border border-[var(--border-color)] hover:border-[var(--color-accent)]"
                              >
                                {action.label}
                              </button>
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
        )}
      </div>

      {!isLoading && pageData.length === 0 && (
        <div className="empty-state">
          <p className="text-gray-400 mb-2 text-lg">No records found</p>
          <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
        </div>
      )}

      {!isLoading && pageCount > 1 && (
        <div className="pagination-container">
          <ReactPaginate
            breakLabel="..."
            nextLabel={
              <span className="flex items-center gap-1">
                Next
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </span>
            }
            previousLabel={
              <span className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Prev
              </span>
            }
            onPageChange={handlePageClick}
            pageRangeDisplayed={3}
            pageCount={pageCount}
            renderOnZeroPageCount={null}
            containerClassName="pagination-list"
            activeClassName="selected"
            disabledClassName="disabled"
          />
        </div>
      )}

      {showDialog && (
        <div className="dialog backdrop-blur-sm bg-black/30">
          <div className="dialog-content">{dialogContent}</div>
        </div>
      )}
    </div>
  );
};

export default ObjectList;
