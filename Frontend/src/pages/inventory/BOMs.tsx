import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Package, Edit } from "lucide-react";
import { inventoryApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { Bom } from "../../types/api";
import CreateBomModal from "./CreateBomModal";
import EditBomModal from "./EditBomModal";
import { ItemSelect } from "../../components/ItemSelect";

const BOMs = () => {
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBom, setSelectedBom] = useState<Bom | null>(null);
  // const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [search, setSearch] = useState("");

  const {
    data: boms,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["boms"],
    queryFn: () => inventoryApi.getBoms(),
  });

  // const { data: items } = useQuery({
  //   queryKey: ["items-for-bom"],
  //   queryFn: () => inventoryApi.getItems({ type: "FINISHED_GOODS" }),
  // });

  const filteredBoms = boms?.filter((bom: Bom) => {
    if (!search) return true;

    const q = search.toLowerCase();
    return (
      bom.item.name.toLowerCase().includes(q) ||
      bom.item.sku.toLowerCase().includes(q)
    );
  });

  const columns = [
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
      key: "version",
      header: "Version",
      width: "w-24",
    },
    {
      key: "bomLines",
      header: "Components",
      cell: (bom: Bom) => (
        <div className="space-y-1 max-w-sm">
          {bom.bomLines.slice(0, 3).map((line, index) => (
            <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
              <div className="font-medium">{line.componentItem.sku}</div>
              <div className="text-gray-600">
                {line.qtyPer} {line.componentItem.uom} per unit
                {line.scrapPercent > 0 && ` (+${line.scrapPercent}% scrap)`}
              </div>
            </div>
          ))}
          {bom.bomLines.length > 3 && (
            <div className="text-xs text-gray-500 italic">
              +{bom.bomLines.length - 3} more
            </div>
          )}
        </div>
      ),
      width: "w-80",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (bom: Bom) => (
        <StatusBadge status={bom.isActive ? "Active" : "Inactive"} />
      ),
      width: "w-24",
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (bom: Bom) => new Date(bom.createdAt).toLocaleDateString(),
      width: "w-32",
    },
  ];

  const handleCreateBom = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditBom = () => {
    refetch();
    setShowEditModal(false);
    setSelectedBom(null);
  };

  const actions = (bom: Bom) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedBom(bom);
          setShowEditModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit BOM"
      >
        <Edit className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bills of Materials
          </h1>
          <p className="text-gray-600">
            Manage product recipes and component lists
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create BOM
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Item
            </label>

            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Items</option>
              {items?.items?.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.sku} - {item.name}
                </option>
              ))}
            </select>
          </div> */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search BOM by Item Name
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type item name or SKU..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total BOMs
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {boms?.length || 0}
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
                <Package className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active BOMs
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {boms?.filter((bom: Bom) => bom.isActive).length || 0}
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
                <Package className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg Components
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {boms?.length
                      ? Math.round(
                          boms.reduce(
                            (sum: number, bom: Bom) =>
                              sum + bom.bomLines.length,
                            0,
                          ) / boms.length,
                        )
                      : 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {/* <DataTable
        data={
          selectedItemId
            ? boms?.filter((bom: Bom) => bom.itemId === selectedItemId) || []
            : boms || []
        }
        columns={columns}
        loading={isLoading}
        actions={actions}
      /> */}
      <DataTable
        data={filteredBoms || []}
        columns={columns}
        loading={isLoading}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateBomModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateBom}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedBom && (
        <EditBomModal
          bom={selectedBom}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBom(null);
          }}
          onSuccess={handleEditBom}
        />
      )}
    </div>
  );
};

export default BOMs;
