import { ThemeProvider } from "./components/shared/ThemeContext";
import { UsersProvider } from "./components/shared/UsersContext";
import AppLayout from "./components/layout/AppLayout";
import FloatingAgentChat from "./components/admin/FloatingAgentChat";

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
        <FloatingAgentChat
          agentName="plusto_user_guide_agent"
          title="יועץ עסקי AI"
        />
      </UsersProvider>
    </ThemeProvider>
  );
}

export default Layout;
