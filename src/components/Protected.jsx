import { Navigate, useLocation } from "react-router-dom";

function Protected({ role, roles, children }) {
  const location = useLocation();
  if (roles.length > 0 && roles.includes(role)) {
    return children;
  } else {
    return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  }
}
export default Protected;
