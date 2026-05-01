import React from "react";
import { X, ArrowRight } from "lucide-react";

interface DetailTransferModalProps {
  transfer: any;
  onClose: () => void;
}

const DetailTransferModal: React.FC<DetailTransferModalProps> = ({
  transfer,
  onClose,
}) => {
  if (!transfer) return null;

  const totalItems = transfer.items?.length || 0;

  const totalQty =
    transfer.items?.reduce(
      (sum: number, item: any) => sum + Number(item.qty || 0),
      0,
    ) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Transfer Details - {transfer.refNo || transfer.id}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Transfer Direction */}
            <div className="bg-blue-50 p-4 rounded-md mb-6">
              <div className="flex items-center">
                <ArrowRight className="h-5 w-5 text-blue-500 mr-2" />
                <div className="text-sm text-blue-800">
                  <strong>Transfer Direction:</strong>{" "}
                  {transfer.fromWarehouse?.code} -{" "}
                  {transfer.fromWarehouse?.name} → {transfer.toWarehouse?.code}{" "}
                  - {transfer.toWarehouse?.name}
                </div>
              </div>
            </div>

            {/* Transfer Items */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Transferred Items
              </h4>

              <div className="space-y-4">
                {transfer.items?.map((item: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Item</div>
                        <div className="font-medium text-gray-900">
                          {item.item?.sku} - {item.item?.name}
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500">Quantity</div>
                        <div className="font-medium">
                          {item.qty} {item.item?.uom || "units"}
                        </div>
                      </div>

                      {/* <div>
                        <div className="text-gray-500">Stock After</div>
                        <div className="text-gray-700">
                          From: {item.stockAfterFrom ?? "-"} | To:{" "}
                          {item.stockAfterTo ?? "-"}
                        </div>
                      </div> */}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transfer Summary */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-900 mb-2">
                Transfer Summary:
              </h4>
              <div className="text-sm text-green-800 space-y-1">
                <div>• Total Items: {totalItems}</div>
                <div>• Total Quantity: {totalQty}</div>
                <div>• Inventory ledger updated for both warehouses</div>
                <div>
                  • Transfer Date:{" "}
                  {new Date(transfer.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-6 border-t mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailTransferModal;
