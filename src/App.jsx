import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes/AppRoutes";

const App = () => (
  <>
    <AppRoutes />
    <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
  </>
);

export default App;