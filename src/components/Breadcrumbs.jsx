import React from "react";

import { useLocation, Link } from "react-router-dom";

const routeNameMap = {
  topics: "Compliance Rules",
  issuers: "Trusted Issuers",
  identities: "Identities",
  create: "Create New",
  edit: "Edit",
  summary: "Summary",
  mint: "Mint",
};

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  if (pathnames.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link to="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;
          const name = routeNameMap[value] || value; // Fallback to path segment if not mapped (e.g. IDs)

          // Heuristic to detect IDs (long strings) and truncate/label them
          const displayName = name.length > 20 ? "Details" : name.charAt(0).toUpperCase() + name.slice(1);

          return (
            <React.Fragment key={to}>
              <li className="text-slate-400">/</li>
              <li>
                {isLast ? (
                  <span className="text-slate-900 font-medium" aria-current="page">
                    {displayName}
                  </span>
                ) : (
                  <Link to={to} className="hover:text-slate-900 transition-colors">
                    {displayName}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
