import Dashboard from './pages/Dashboard';
import AddProduct from './pages/AddProduct';
import Recommendations from './pages/Recommendations';
import ActionBank from './pages/ActionBank';
import Admin from './pages/Admin';
import SupplierAnalysis from './pages/SupplierAnalysis';
import CustomerManagement from './pages/CustomerManagement';
import ManageProducts from './pages/ManageProducts';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import WebsiteScan from './pages/WebsiteScan';
import SupportTicket from './pages/SupportTicket';
import FinancialFlow from './pages/FinancialFlow';
import FileUpload from './pages/FileUpload';
import ProductCatalog from './pages/ProductCatalog';
import BusinessForecast from './pages/BusinessForecast';
import StrategicMoves from './pages/StrategicMoves';
import CatalogPage from './pages/CatalogPage';
import WhatsAppTest from './pages/WhatsAppTest';
import Promotions from './pages/Promotions';
import Welcome from './pages/Welcome';
import InitialSetup from './pages/InitialSetup';
import PendingApproval from './pages/PendingApproval';
import MyLeads from './pages/MyLeads';
import TaskManagement from './pages/TaskManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "AddProduct": AddProduct,
    "Recommendations": Recommendations,
    "ActionBank": ActionBank,
    "Admin": Admin,
    "SupplierAnalysis": SupplierAnalysis,
    "CustomerManagement": CustomerManagement,
    "ManageProducts": ManageProducts,
    "FAQ": FAQ,
    "Contact": Contact,
    "WebsiteScan": WebsiteScan,
    "SupportTicket": SupportTicket,
    "FinancialFlow": FinancialFlow,
    "FileUpload": FileUpload,
    "ProductCatalog": ProductCatalog,
    "BusinessForecast": BusinessForecast,
    "StrategicMoves": StrategicMoves,
    "CatalogPage": CatalogPage,
    "WhatsAppTest": WhatsAppTest,
    "Promotions": Promotions,
    "Welcome": Welcome,
    "InitialSetup": InitialSetup,
    "PendingApproval": PendingApproval,
    "MyLeads": MyLeads,
    "TaskManagement": TaskManagement,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};