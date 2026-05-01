import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Factory,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  AlertTriangle,
  CircleEllipsis,
  Container,
} from "lucide-react";
import {
  inventoryApi,
  productionApi,
  purchaseApi,
  salesApi,
  cashApi,
  posApi,
} from "../lib/api";

import { useAuthStore } from "../store/authStore";
const Dashboard = () => {
  const { data: inventory } = useQuery({
    queryKey: ["inventory-valuation"],
    queryFn: () => inventoryApi.getInventoryValuation(),
  });

  const { user } = useAuthStore();
  const canviewall =
    user?.roles.includes("Senior Accountant") ||
    user?.roles.includes("General Manager") ||
    user?.roles.includes("Manager");

  const { data: productionOrders } = useQuery({
    queryKey: ["production-orders", { limit: 10 }],
    queryFn: () => productionApi.getProductionOrders({ limit: 10 }),
  });

  const { data: purchases } = useQuery({
    queryKey: ["purchases", { limit: 10 }],
    queryFn: () => purchaseApi.getPurchases({ limit: 10 }),
  });

  const { data: sales } = useQuery({
    queryKey: ["sales", { limit: 10 }],
    queryFn: () => salesApi.getSales({ limit: 10, status: "INVOICED" }),
  });

  //FILTER SALES TO ONLY THIS MONTH
  const filteredSales = sales?.sales.filter((sale: any) => {
    const saleDate = new Date(sale.orderDate);
    const now = new Date();
    return (
      saleDate.getMonth() === now.getMonth() &&
      saleDate.getFullYear() === now.getFullYear()
    );
  });

  //get pos sales for this month
  const { data: posSales } = useQuery({
    queryKey: ["pos-sales"],
    queryFn: () =>
      posApi.getSalesForDashboard({
        status: "COMPLETED",
        dateFrom: new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        ).toISOString(),
        dateTo: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0,
        ).toISOString(),
      }),
  });
  // console.log("POS Sales Data:", posSales);

  //Filter pos sales to only this
  // if (posSales) {
  //   posSales.sales = posSales.sales.filter((sale: any) => {
  //     const saleDate = new Date(sale.createdAt);
  //     const now = new Date();
  //     return (
  //       saleDate.getMonth() === now.getMonth() &&
  //       saleDate.getFullYear() === now.getFullYear()
  //     );
  //   });
  // }

  // console.log("Filtered POS Sales for this month:", posSales);

  //if user is not accountant or gm, filter pos sales to only those created by the user
  if (posSales && !canviewall) {
    posSales.sales = posSales.sales.filter(
      (sale: any) => sale.user?.name === user?.name,
    );
  }

  //calculate total pos sales amount for the month
  const totalPosSalesAmount = posSales?.sales?.reduce(
    (sum: number, sale: any) => sum + Number(sale.totalAmount || 0),
    0,
  );

  //if user is not accountant or gm, filter sales orders to only those created by the user
  if (filteredSales && !canviewall) {
    sales.sales = filteredSales.filter(
      (sale: any) => sale.preparer?.name === user?.name,
    );
  }

  //calculate total sales amount for the month
  const totalSalesAmount = sales?.sales?.reduce(
    (sum: number, sale: any) => sum + Number(sale.totalAmount || 0),
    0,
  );

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  // const filteredAccounts = cashAccounts?.accounts?.filter((account: any) => account.name !== 'Memo Clearing');

  const stats = [
    {
      name: "Stock Value",
      value: inventory
        ? `₦${
            inventory.totalValue?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0"
          }`
        : "₦0",
      icon: Container,
      // change: '+4.75%',
      // changeType: 'increase'
    },
    {
      name: "Active Production Orders",
      value:
        productionOrders?.orders?.filter(
          (po: any) => po.status === "IN_PROGRESS",
        ).length || 0,
      icon: Factory,
      // change: '+8.2%',
      // changeType: 'increase'
    },
    {
      name: "Pending Purchases",
      value:
        purchases?.purchases?.filter((p: any) => p.status === "ORDERED")
          .length || 0,
      icon: ShoppingCart,
      // change: '-2.1%',
      // changeType: 'decrease'
    },
    {
      name: "Sales This Month",
      value: `₦${
        (totalSalesAmount + (totalPosSalesAmount || 0)).toLocaleString(
          undefined,
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        ) || "0"
      }`,
      icon: TrendingUp,
      // change: '+12.5%',
      // changeType: 'increase'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-velvet">Dashboard</h1>
        <p className="text-light-velvet">
          Welcome to BizLenZ Accounting Software
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-light-velvet" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-light-velvet truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-velvet">
                        {stat.value}
                      </div>
                      <div
                        className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stat.changeType === "increase"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cash Account Balances */}
      {canviewall && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Cash Account Balances
            </h3>
          </div>
          <div className="px-4 py-4 sm:px-6">
            {cashAccounts?.accounts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cashAccounts?.accounts.map((account: any) => (
                  <div key={account.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {account.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {account.code}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center mt-1">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {account.accountType}
                          {account.bankName && ` - ${account.bankName}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-semibold ${
                            account.balance >= 0 ? "text-velvet" : "text-rose"
                          }`}
                        >
                          {Number(account.balance).toLocaleString("en-NG", {
                            style: "currency",
                            currency: "NGN",
                          })}
                        </div>
                        <div
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            account.isActive
                              ? "bg-velvet text-lavender"
                              : "bg-gray-100 text-light-rose"
                          }`}
                        >
                          {account.isActive ? "Active" : "Inactive"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500">No cash accounts found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Cash accounts will appear here once created
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Production Orders */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Production Orders
            </h3>
          </div>
          <div className="px-4 py-4 sm:px-6">
            {productionOrders?.orders?.slice(0, 5).map((order: any) => (
              <div
                key={order.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.orderNo}
                  </p>
                  <p className="text-sm text-gray-500">{order.item.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {order.qtyTarget} {order.item.type}
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === "FINISHED"
                        ? "bg-velvet text-lavender"
                        : order.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-sm text-gray-500 py-4">
                No production orders found
              </p>
            )}
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Inventory Alerts
            </h3>
          </div>
          <div className="px-4 py-4 sm:px-6">
            {inventory?.valuation
              ?.filter((item: any) => item.qty < item.minimumStockLevel)
              .slice(0, 5)
              .map((item: any) => (
                <div
                  key={item.itemId}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.sku}
                      </p>
                      <p className="text-sm text-gray-500">{item.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      {item.qty} remaining
                    </p>
                    <p className="text-xs text-gray-500">Low stock</p>
                  </div>
                </div>
              )) || (
              <p className="text-sm text-gray-500 py-4">No inventory alerts</p>
            )}
          </div>
        </div>

        {/* Pending Purchases */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Pending Purchase Orders
            </h3>
          </div>
          <div className="px-4 py-4 sm:px-6">
            {purchases?.purchases
              ?.filter((p: any) => p.status === "ORDERED")
              .slice(0, 5)
              .map((purchase: any) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {purchase.orderNo}
                    </p>
                    <p className="text-sm text-gray-500">
                      {purchase.vendor.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      ₦{purchase.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(purchase.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )) || (
              <p className="text-sm text-gray-500 py-4">No pending purchases</p>
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Sales Orders
            </h3>
          </div>
          <div className="px-4 py-4 sm:px-6">
            {sales?.sales?.slice(0, 5).map((sale: any) => (
              <div
                key={sale.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {sale.orderNo}
                  </p>
                  <p className="text-sm text-gray-500">{sale.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    ₦
                    {Number(sale.totalAmount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      sale.status === "PAID"
                        ? "bg-green-100 text-green-800"
                        : sale.status === "INVOICED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {sale.status}
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-sm text-gray-500 py-4">
                No sales orders found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
