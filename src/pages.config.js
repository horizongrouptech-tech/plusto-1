import ActionBank from './pages/ActionBank';
import AddProduct from './pages/AddProduct';
import Admin from './pages/Admin';
import BusinessForecast from './pages/BusinessForecast';
import CatalogPage from './pages/CatalogPage';
import Contact from './pages/Contact';
import CustomerManagement from './pages/CustomerManagement';
import CustomerManagementNew from './pages/CustomerManagementNew';
import Dashboard from './pages/Dashboard';
import FAQ from './pages/FAQ';
import FileUpload from './pages/FileUpload';
import FinancialFlow from './pages/FinancialFlow';
import Home from './pages/Home';
import InitialSetup from './pages/InitialSetup';
import LeadIntakeManagement from './pages/LeadIntakeManagement';
import ManageProducts from './pages/ManageProducts';
import MyLeads from './pages/MyLeads';
import PendingApproval from './pages/PendingApproval';
import ProductCatalog from './pages/ProductCatalog';
import Promotions from './pages/Promotions';
import Recommendations from './pages/Recommendations';
import StrategicMoves from './pages/StrategicMoves';
import SupplierAnalysis from './pages/SupplierAnalysis';
import SupportTicket from './pages/SupportTicket';
import TaskManagement from './pages/TaskManagement';
import WebsiteScan from './pages/WebsiteScan';
import Welcome from './pages/Welcome';
import WhatsAppTest from './pages/WhatsAppTest';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActionBank": ActionBank,
    "AddProduct": AddProduct,
    "Admin": Admin,
    "BusinessForecast": BusinessForecast,
    "CatalogPage": CatalogPage,
    "Contact": Contact,
    "CustomerManagement": CustomerManagement,
    "CustomerManagementNew": CustomerManagementNew,
    "Dashboard": Dashboard,
    "FAQ": FAQ,
    "FileUpload": FileUpload,
    "FinancialFlow": FinancialFlow,
    "Home": Home,
    "InitialSetup": InitialSetup,
    "LeadIntakeManagement": LeadIntakeManagement,
    "ManageProducts": ManageProducts,
    "MyLeads": MyLeads,
    "PendingApproval": PendingApproval,
    "ProductCatalog": ProductCatalog,
    "Promotions": Promotions,
    "Recommendations": Recommendations,
    "StrategicMoves": StrategicMoves,
    "SupplierAnalysis": SupplierAnalysis,
    "SupportTicket": SupportTicket,
    "TaskManagement": TaskManagement,
    "WebsiteScan": WebsiteScan,
    "Welcome": Welcome,
    "WhatsAppTest": WhatsAppTest,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};