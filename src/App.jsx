import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes/AppRoutes";
import AIChatbot from "./features/ai/components/AIChatbot";

const App = () => (
  <>
    <AppRoutes />
      <AIChatbot />      
    <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
  </>
);

export default App;