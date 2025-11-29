import React from "react";

import Breadcrumbs from "./Breadcrumbs";

const Layout = ({ children, sidebar }) => {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex">
      {sidebar && <div className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col">{sidebar}</div>}

      <main className={`flex-1 min-h-screen transition-all duration-300 ${sidebar ? "pl-64" : ""}`}>
        <div className="max-w-7xl mx-auto px-8 py-8 animate-fade-in-up">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
