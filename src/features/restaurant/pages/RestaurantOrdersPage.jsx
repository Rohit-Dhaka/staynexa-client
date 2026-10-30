import { useState } from "react";
import { ClipboardList, PlusCircle } from "lucide-react";

import CreateOrderPage from "./CreateOrderPage";
import OrdersPage from "./OrdersPage";

export default function RestaurantOrdersPage() {
  const [activeView, setActiveView] = useState("create");

  const tabs = [
    {
      id: "create",
      label: "Create Order",
      icon: PlusCircle,
    },
    {
      id: "list",
      label: "Order List",
      icon: ClipboardList,
    },
  ];

  return (
    <div className="min-h-screen space-y-4 sm:space-y-6">
      
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            Restaurant Management
          </h1>

          <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
            Create orders and manage restaurant orders.
          </p>
        </div>

        
        <div className="grid w-full grid-cols-2 gap-2 lg:w-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                aria-pressed={isActive}
                className={`inline-flex min-w-0 items-center justify-center gap-2 rounded border px-3 py-2.5 text-xs font-medium sm:px-4 sm:text-sm ${
                  isActive
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <Icon size={17} className="shrink-0" />

                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      
      <div className="min-w-0">
        {activeView === "create" ? <CreateOrderPage /> : <OrdersPage />}
      </div>
    </div>
  );
}