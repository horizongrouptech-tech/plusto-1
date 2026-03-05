import { ThemeProvider } from "./components/shared/ThemeContext";
import { UsersProvider } from "./components/shared/UsersContext";
import AppLayout from "./components/layout/AppLayout";

/**
 * Layout — wrapper ראשי שנקרא מ-pages.config.js.
 * עוטף את כל הדפים ב-ThemeProvider + UsersProvider + AppLayout.
 *
 * כל הלוגיקה (routing, auth redirects, sidebar, topbar)
 * נמצאת בתוך AppLayout ו-sub-components שלו.
 */
function Layout({ children }) {
  return (
    <ThemeProvider>
      <UsersProvider>
        <AppLayout>{children}</AppLayout>
      </UsersProvider>
    </ThemeProvider>
  );
}

export default Layout;
