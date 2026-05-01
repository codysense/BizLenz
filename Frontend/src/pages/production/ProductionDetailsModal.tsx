import React from 'react';
import { X, Factory, Package, Calendar, User } from 'lucide-react';
import { ProductionOrder } from '../../types/api';
import StatusBadge from '../../components/StatusBadge';

interface ProductionDetailsModalProps {
  order: ProductionOrder;
  onClose: () => void;
}

const ProductionDetailsModal = ({ order, onClose }: ProductionDetailsModalProps) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Production Order Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Header Information */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Order Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Order No:</span>
                    <span className="text-sm font-medium">{order.orderNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status:</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Target Qty:</span>
                    <span className="text-sm font-medium">{order.qtyTarget}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Produced Qty:</span>
                    <span className="text-sm font-medium">{order.qtyProduced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Progress:</span>
                    <span className="text-sm font-medium">
                      {((Number(order.qtyProduced) / Number(order.qtyTarget)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Item & Location</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Item SKU:</span>
                    <span className="text-sm font-medium">{order.item.sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Item Name:</span>
                    <span className="text-sm font-medium">{order.item.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Warehouse:</span>
                    <span className="text-sm font-medium">{order.warehouse.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Started:</span>
                    <span className="text-sm font-medium">
                      {order.startedAt ? new Date(order.startedAt).toLocaleDateString() : 'Not started'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Finished:</span>
                    <span className="text-sm font-medium">
                      {order.finishedAt ? new Date(order.finishedAt).toLocaleDateString() : 'Not finished'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOM Information */}
            {order.bom && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">Bill of Materials (Version {order.bom.version || '1.0'})</h4>
                  <div className="text-sm text-gray-500">
                    {order.bom.bomLines.length} components
                  </div>
                </div>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Component
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty Per Unit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Required
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          With Scrap
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scrap %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {order.bom.bomLines.map((line) => (
                        <tr key={line.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{line.componentItem.sku}</div>
                              <div className="text-sm text-gray-500">{line.componentItem.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {line.qtyPer} {line.componentItem.uom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(Number(line.qtyPer) * Number(order.qtyTarget)).toFixed(3)} {line.componentItem.uom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(() => {
                              const baseQty = Number(line.qtyPer) * Number(order.qtyTarget);
                              const withScrap = baseQty * (1 + Number(line.scrapPercent) / 100);
                              return `${withScrap.toFixed(3)} ${line.componentItem.uom}`;
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {line.scrapPercent}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
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

export default ProductionDetailsModal;