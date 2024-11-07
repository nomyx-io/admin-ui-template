import styles from "./Layout.css";
const Layout = ({ children }) => {
    return(
        <main className="layout">{children}</main>
    );
};

export default Layout;