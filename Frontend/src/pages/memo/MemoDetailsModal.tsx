import React from "react";
import { X, Calendar, User, Building } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";

interface MemoDetailsModalProps {
  memo: any;
  onClose: () => void;
}

const MemoDetailsModal = ({ memo, onClose }: MemoDetailsModalProps) => {
  if (!memo) return null;

  const getCategory = () => {
    if (memo.saleId) return "Sales Return";
    if (memo.purchaseId) return "Purchase Return";
    if (memo.customerId) return "Customer Adjustment";
    if (memo.vendorId) return "Vendor Adjustment";
    return "General";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Memo Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Memo Information + Party Info */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
              {/* Memo Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Memo Information
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Memo No:</span>
                    <span className="text-sm font-medium">{memo.memoNo}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Date:</span>
                    <span className="text-sm font-medium">
                      {new Date(memo.date).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Module:</span>
                    <StatusBadge status={memo.module} />
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Type:</span>
                    <span className="text-sm font-medium">{memo.memoType}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Category:</span>
                    <span className="text-sm font-medium">{getCategory()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Amount:</span>
                    <span className="text-sm font-medium">
                      ₦{Number(memo.amount).toLocaleString()}
                    </span>
                  </div>

                  {/* <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Journal No:</span>
                    <span className="text-sm font-medium">
                      {memo.journal?.journalNo || "-"}
                    </span>
                  </div> */}
                </div>
              </div>

              {/* Party Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Party Information
                </h4>

                <div className="space-y-2">
                  {memo.customer && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Customer Code:
                        </span>
                        <span className="text-sm font-medium">
                          {memo.customer.code}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Customer Name:
                        </span>
                        <span className="text-sm font-medium">
                          {memo.customer.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Customer Address:
                        </span>
                        <span className="text-sm font-medium">
                          {memo.customer.address}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Customer Phone:
                        </span>
                        <span className="text-sm font-medium">
                          {memo.customer.phone}
                        </span>
                      </div>
                    </>
                  )}

                  {memo.vendor && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Vendor Code:
                        </span>
                        <span className="text-sm font-medium">
                          {memo.vendor.code}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Vendor Name:
                        </span>
                        <span className="text-sm font-medium">
                          {memo.vendor.name}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Vendor Address:
                        </span>
                        <span className="text-sm font-medium">
                          {memo.vendor.address}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Vendor Phone:
                        </span>
                        <span className="text-sm font-medium">
                          {memo.vendor.phone}
                        </span>
                      </div>
                    </>
                  )}

                  {!memo.customer && !memo.vendor && (
                    <div className="text-sm text-gray-500">
                      No customer/vendor linked
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Linked Documents */}
            {(memo.sale || memo.purchase) && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Linked Document
                </h4>

                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  {memo.sale && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">
                        Sales Order:
                      </span>
                      <span className="text-sm font-medium">
                        {memo.sale.orderNo}
                      </span>
                    </div>
                  )}

                  {memo.purchase && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">
                        Purchase Order:
                      </span>
                      <span className="text-sm font-medium">
                        {memo.purchase.orderNo}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {memo.description && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Description
                </h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  {memo.description}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-6">
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

export default MemoDetailsModal;
