import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes/AppRoutes";
import AIChatbot from "./features/ai/components/AIChatbot";
import ScrollToTop from "./components/common/ScrollToTop";
import AdminCabDriversPage from "./features/cab/pages/AdminCabDriversPage";

const App = () => (
  <>
  
    <AppRoutes />
    <ScrollToTop/>
      <AIChatbot />      
    <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
  </>
);

export default App;