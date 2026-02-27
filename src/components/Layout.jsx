import Breadcrumbs from "./Breadcrumbs";
import { useRoleContext } from "../context/RoleContext"; // adjust path if needed

const Layout = ({ children }) => {
  const { user } = useRoleContext();

  return (
    <main className="layout">
      {user && <Breadcrumbs />}
      {children}
    </main>
  );
};

export default Layout;
