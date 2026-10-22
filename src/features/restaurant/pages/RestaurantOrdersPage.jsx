
import { useState } from "react";
import { ClipboardList, PlusCircle } from "lucide-react";

import CreateOrderPage from "./CreateOrderPage";
import OrdersPage from "./OrdersPage";

export default function RestaurantOrdersPage() {
  const [activeView, setActiveView] = useState("create");

  return (
    <div className="min-h-screen space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Restaurant Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create orders and manage restaurant orders.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView("create")}
            className={`inline-flex items-center gap-2 rounded border px-4 py-2.5 text-sm font-medium ${
              activeView === "create"
                ? "border-black bg-black text-white"
                : "border-gray-200 bg-white text-gray-700 hover:"
            }`}
          >
            <PlusCircle size={17} />
            Create Order
          </button>

          <button
            type="button"
            onClick={() => setActiveView("list")}
            className={`inline-flex items-center gap-2 rounded border px-4 py-2.5 text-sm font-medium ${
              activeView === "list"
                ? "border-black bg-black text-white"
                : "border-gray-200 bg-white text-gray-700 hover:"
            }`}
          >
            <ClipboardList size={17} />
            Order List
          </button>
        </div>
      </div>

      {/* Selected View */}
      <div>
        {activeView === "create" ? (
          <CreateOrderPage />
        ) : (
          <OrdersPage />
        )}
      </div>
    </div>
  );
}
