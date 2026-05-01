import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Factory, DollarSign, Package, TrendingUp } from "lucide-react";
import { productionApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import { GenericSearchSelect } from "../../components/GenericSearchCombo";

interface WipSummaryItem {
  orderNo: string;
  item: {
    sku: string;
    name: string;
  };
  issues: number;
  labor: number;
  overhead: number;
  receipts: number;
  balance: number;
}

const WipSummary = () => {
  const [productionOrderFilter, setProductionOrderFilter] = useState("");

  const { data: wipData, isLoading } = useQuery({
    queryKey: ["wip-summary", { productionOrderId: productionOrderFilter }],
    queryFn: () =>
      productionApi.getWipSummary(
        productionOrderFilter
          ? { productionOrderId: productionOrderFilter }
          : undefined,
      ),
  });

  const { data: productionOrders } = useQuery({
    queryKey: ["production-orders-for-wip"],
    queryFn: () => productionApi.getProductionOrders({ limit: 100 }),
  });

  const mappedOrders = [
    {
      id: "",
      orderNo: "All",
      itemName: "Production Orders",
    },
    ...(productionOrders?.orders?.map((order: any) => ({
      id: order.id,
      orderNo: order.orderNo,
      itemName: order.item?.name || "",
    })) || []),
  ];

  const columns = [
    {
      key: "orderNo",
      header: "Production Order",
      width: "w-32",
    },
    {
      key: "item.sku",
      header: "Item SKU",
      width: "w-32",
    },
    {
      key: "item.name",
      header: "Item Name",
      width: "w-48",
    },
    {
      key: "issues",
      header: "Material Issues",
      cell: (item: WipSummaryItem) => `₦${item.issues.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "labor",
      header: "Labor Cost",
      cell: (item: WipSummaryItem) => `₦${item.labor.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "overhead",
      header: "Overhead",
      cell: (item: WipSummaryItem) => `₦${item.overhead.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "receipts",
      header: "FG Receipts",
      cell: (item: WipSummaryItem) => `₦${item.receipts.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "balance",
      header: "WIP Balance",
      cell: (item: WipSummaryItem) => (
        <span
          className={`font-semibold ${item.balance > 0 ? "text-blue-600" : "text-gray-500"}`}
        >
          ₦{item.balance.toLocaleString()}
        </span>
      ),
      width: "w-32",
    },
  ];

  // Calculate summary statistics
  const totalIssues =
    wipData?.reduce(
      (sum: number, item: WipSummaryItem) => sum + item.issues,
      0,
    ) || 0;
  const totalLabor =
    wipData?.reduce(
      (sum: number, item: WipSummaryItem) => sum + item.labor,
      0,
    ) || 0;
  const totalOverhead =
    wipData?.reduce(
      (sum: number, item: WipSummaryItem) => sum + item.overhead,
      0,
    ) || 0;
  const totalWipBalance =
    wipData?.reduce(
      (sum: number, item: WipSummaryItem) => sum + item.balance,
      0,
    ) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Work in Progress Summary
          </h1>
          <p className="text-gray-600">
            Track manufacturing costs and WIP balances
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Production Order
            </label>
            <GenericSearchSelect
              data={mappedOrders}
              value={productionOrderFilter}
              onChange={setProductionOrderFilter}
              valueKey="id"
              searchKeys={["orderNo", "itemName"]}
              placeholder="Search production orders..."
              displayValue={(item) =>
                item ? `${item.orderNo} - ${item.itemName}` : ""
              }
              renderOption={(item) => `${item.orderNo} - ${item.itemName}`}
            />
            {/* <select
              value={productionOrderFilter}
              onChange={(e) => setProductionOrderFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Production Orders</option>
              {productionOrders?.orders?.map((order: any) => (
                <option key={order.id} value={order.id}>
                  {order.orderNo} - {order.item.name}
                </option>
              ))}
            </select> */}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Material Issues
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ₦{totalIssues.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Factory className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Labor Cost
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ₦{totalLabor.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Overhead
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ₦{totalOverhead.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total WIP Balance
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ₦{totalWipBalance.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable data={wipData || []} columns={columns} loading={isLoading} />
    </div>
  );
};

export default WipSummary;
