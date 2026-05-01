import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  ShoppingCart,
  RotateCcw,
  DollarSign,
  Clock,
  Users,
  Package,
} from "lucide-react";
import { posApi, inventoryApi, cashApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import CreatePosSessionModal from "./CreatePosSessionModal";
import PosTerminal from "./PosTerminal";
import PosReturnsModal from "./PosReturnsModal";

const PosDashboard = () => {
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const { user } = useAuthStore();

  const { data: currentSession, refetch: refetchSession } = useQuery({
    queryKey: ["current-pos-session"],
    queryFn: () => posApi.getCurrentSession(),
  });

  // console.log("Current User ", user);

  const today = new Date().toISOString().split("T")[0]; // "2025-09-03"

  const { data: todaySales } = useQuery({
    queryKey: ["today-pos-sales"],
    queryFn: () =>
      posApi.getSales({
        dateFrom: `${today}T00:00:00.000Z`,
        dateTo: `${today}T23:59:59.999Z`,
        status: "COMPLETED",
      }),
  });

  //Filter today's sales to only those created by the user if they don't have permission to view all sales
  const canviewall = user?.permissions?.includes("VIEW_ALL_SALES");
  if (todaySales && !canviewall) {
    todaySales.sales = todaySales.sales.filter(
      (sale: any) => sale.user?.name === user?.name,
    );
  }

  // const { data: warehouseItems } = useQuery({
  //   queryKey: ["warehouse-items", user?.warehouseId],
  //   queryFn: () =>
  //     inventoryApi.getItems({
  //       type: "FINISHED_GOODS",
  //       limit: 100,
  //       includeStock: "true",
  //     }),
  //   enabled: !!user?.warehouseId,
  // });

  // console.log(warehouseItems);
  const { data: cashAccounts } = useQuery({
    queryKey: ["pos-cash-accounts"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const handleCreateSession = () => {
    refetchSession();
    setShowCreateSessionModal(false);
  };

  const handleCloseSession = async () => {
    if (
      currentSession?.session &&
      confirm("Are you sure you want to close the current session?")
    ) {
      try {
        const closingBalance = prompt("Enter closing balance:");
        if (closingBalance) {
          await posApi.closeSession(currentSession.session.id, {
            closingBalance: parseFloat(closingBalance),
          });
          refetchSession();
        }
      } catch (error) {
        console.error("Close session error:", error);
      }
    }
  };

  const stats = [
    {
      name: "Today's Sales",
      value: todaySales?.sales?.length || 0,
      icon: ShoppingCart,
      color: "text-blue-600",
    },
    {
      name: "Today's Revenue",
      value: `₦${todaySales?.sales?.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount), 0).toLocaleString() || "0"}`,
      icon: DollarSign,
      color: "text-green-600",
    },
    // {
    //   name: "Available Items",
    //   value: warehouseItems?.items?.length || 0,
    //   icon: Package,
    //   color: "text-purple-600",
    // },
    {
      name: "Session Status",
      value: currentSession?.session ? "OPEN" : "CLOSED",
      icon: Clock,
      color: currentSession?.session ? "text-green-600" : "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Point of Sales</h1>
          <p className="text-gray-600">
            Fast sales processing for walk-in customers
          </p>
        </div>
        <div className="flex space-x-2">
          {!currentSession?.session ? (
            <button
              onClick={() => setShowCreateSessionModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start Session
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowTerminal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Sale
              </button>
              <button
                onClick={() => setShowReturnsModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Process Return
              </button>
              <button
                onClick={handleCloseSession}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Clock className="h-4 w-4 mr-2" />
                Close Session
              </button>
            </>
          )}
        </div>
      </div>

      {/* Current Session Info */}
      {currentSession?.session && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-green-900">
                Active Session: {currentSession.session.sessionNo}
              </h3>
              <p className="text-green-700">
                Started:{" "}
                {new Date(currentSession.session.openedAt).toLocaleString()} |
                Opening Balance: ₦
                {currentSession.session.openingBalance.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-green-900">
                Sales: ₦{currentSession.session.totalSales.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">
                Returns: ₦{currentSession.session.totalReturns.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Quick Actions
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => setShowTerminal(true)}
              disabled={!currentSession?.session}
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="h-8 w-8 text-gray-400 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">New Sale</div>
                <div className="text-sm text-gray-500">
                  Process customer sale
                </div>
              </div>
            </button>

            <button
              onClick={() => setShowReturnsModal(true)}
              disabled={!currentSession?.session}
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-8 w-8 text-gray-400 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Process Return</div>
                <div className="text-sm text-gray-500">Handle returns</div>
              </div>
            </button>

            <a
              href="/sales/customers"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Users className="h-8 w-8 text-gray-400 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">
                  Manage Customers
                </div>
                <div className="text-sm text-gray-500">Add/edit customers</div>
              </div>
            </a>

            <a
              href="/inventory/items"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Package className="h-8 w-8 text-gray-400 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">View Inventory</div>
                <div className="text-sm text-gray-500">Check stock levels</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateSessionModal && (
        <CreatePosSessionModal
          onClose={() => setShowCreateSessionModal(false)}
          onSuccess={handleCreateSession}
        />
      )}

      {showTerminal && currentSession?.session && (
        <PosTerminal
          session={currentSession.session}
          onClose={() => setShowTerminal(false)}
          onSaleComplete={() => {
            setShowTerminal(false);
            refetchSession();
          }}
        />
      )}

      {showReturnsModal && currentSession?.session && (
        <PosReturnsModal
          session={currentSession.session}
          onClose={() => setShowReturnsModal(false)}
          onReturnComplete={() => {
            setShowReturnsModal(false);
            refetchSession();
          }}
        />
      )}
    </div>
  );
};

export default PosDashboard;
