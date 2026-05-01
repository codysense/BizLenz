import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../lib/api';
import toast from 'react-hot-toast';
import { ItemSelect } from '../../components/ItemSelect';

const createBulkTransferSchema = z.object({
  fromWarehouseId: z.string().min(1, 'Source warehouse is required'),
  toWarehouseId: z.string().min(1, 'Destination warehouse is required'),
  transferItems: z.array(z.object({
    itemId: z.string().min(1, 'Item is required'),
    qty: z.number().positive('Quantity must be positive'),
  })).min(1, 'At least one item is required'),
}).refine((data) => data.fromWarehouseId !== data.toWarehouseId, {
  message: "Source and destination warehouses must be different",
  path: ["toWarehouseId"],
});

type CreateBulkTransferFormData = z.infer<typeof createBulkTransferSchema>;

interface CreateTransferModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTransferModal = ({ onClose, onSuccess }: CreateTransferModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    getValue,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateBulkTransferFormData>({
    resolver: zodResolver(createBulkTransferSchema),
    defaultValues: {
      transferItems: [{ itemId: '', qty: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'transferItems'
  });

  const selectedFromWarehouse = watch('fromWarehouseId');
  const selectedToWarehouse = watch('toWarehouseId');
  const watchedItems = watch('transferItems');

  const { data: items } = useQuery({
    queryKey: ['items-for-transfer'],
    queryFn: () => inventoryApi.getItems({ limit: 100, includeStock: true })
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses-for-transfer'],
    queryFn: () => inventoryApi.getWarehouses()
  });

  // Get stock information for selected items and warehouse
  const { data: stockData } = useQuery({
    queryKey: ['bulk-transfer-stock', selectedFromWarehouse, watchedItems],
    queryFn: async () => {
      if (!selectedFromWarehouse || !watchedItems.length) return {};
      
      const stockPromises = watchedItems
        .filter(item => item.itemId)
        .map(async (item) => {
          try {
            const stock = await inventoryApi.getItemStock(item.itemId, selectedFromWarehouse);
            return { itemId: item.itemId, stock: stock.qty };
          } catch {
            return { itemId: item.itemId, stock: 0 };
          }
        });
      
      const stockResults = await Promise.all(stockPromises);
      return stockResults.reduce((acc, result) => {
        acc[result.itemId] = result.stock;
        return acc;
      }, {} as Record<string, number>);
    },
    enabled: !!(selectedFromWarehouse && watchedItems.some(item => item.itemId))
  });

  // const onSubmit = async (data: CreateBulkTransferFormData) => {
  //   try {
  //     // Process each item transfer
  //     for (const transferItem of data.transferItems) {
  //       await inventoryApi.transferInventory({
  //         itemId: transferItem.itemId,
  //         fromWarehouseId: data.fromWarehouseId,
  //         toWarehouseId: data.toWarehouseId,
  //         qty: transferItem.qty
  //       });
  //     }
      
  //     toast.success(`Successfully transferred ${data.transferItems.length} items`);
  //     onSuccess();
  //   } catch (error) {
  //     console.error('Create bulk transfer error:', error);
  //   }
  // };

  const onSubmit = async (data: CreateBulkTransferFormData) => {
  try {
    const response = await inventoryApi.transferInventoryBulk({
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      transferItems: data.transferItems,
    });

    toast.success("Inventory transferred successfully");

    //handlePrintTransfer(response.refId); // 🔥
    onSuccess();
  } catch (error) {
    console.error("Create bulk transfer error:", error);
    toast.error("Bulk transfer failed");
  }
};


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create Bulk Inventory Transfer
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Warehouse Selection */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    From Warehouse *
                  </label>
                  <select
                    {...register('fromWarehouseId')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select source warehouse</option>
                    {warehouses?.warehouses?.map((warehouse: any) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} - {warehouse.name}
                      </option>
                    ))}
                  </select>
                  {errors.fromWarehouseId && (
                    <p className="mt-1 text-sm text-red-600">{errors.fromWarehouseId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    To Warehouse *
                  </label>
                  <select
                    {...register('toWarehouseId')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select destination warehouse</option>
                    {warehouses?.warehouses?.filter((w: any) => w.id !== selectedFromWarehouse).map((warehouse: any) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} - {warehouse.name}
                      </option>
                    ))}
                  </select>
                  {errors.toWarehouseId && (
                    <p className="mt-1 text-sm text-red-600">{errors.toWarehouseId.message}</p>
                  )}
                </div>
              </div>

              {selectedFromWarehouse && selectedToWarehouse && (
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex items-center">
                    <ArrowRight className="h-5 w-5 text-blue-500 mr-2" />
                    <div className="text-sm text-blue-800">
                      <strong>Transfer Direction:</strong> {warehouses?.warehouses?.find((w: any) => w.id === selectedFromWarehouse)?.name} → {warehouses?.warehouses?.find((w: any) => w.id === selectedToWarehouse)?.name}
                    </div>
                  </div>
                </div>
              )}

              {/* Transfer Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Items to Transfer</h4>
                  <button
                    type="button"
                    onClick={() => append({ itemId: '', qty: 1 })}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </button>
                </div>

                {errors.transferItems && (
                  <p className="mb-4 text-sm text-red-600">{errors.transferItems.message}</p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Item *
                          </label>
                          <ItemSelect
                           items={items?.items || []}
                            value={watch(`transferItems.${index}.itemId`)}
                            onChange={(val) => setValue(`transferItems.${index}.itemId`, val)}
                            error={errors.transferItems?.[index]?.itemId?.message}
                          />

                          {/* <select
                            {...register(`transferItems.${index}.itemId`)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="">Select item to transfer</option>
                            {items?.items?.map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.sku} - {item.name} (Total Stock: {item.stockQty || 0})
                              </option>
                            ))}
                          </select>
                          {errors.transferItems?.[index]?.itemId && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.transferItems[index]?.itemId?.message}
                            </p>
                          )} */}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Available Stock
                          </label>
                          <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm">
                            {(() => {
                              const selectedItem = items?.items?.find((item: any) => item.id === watchedItems[index]?.itemId);
                              const stock = stockData?.[watchedItems[index]?.itemId] || 0;
                              const isInsufficient = stock < (watchedItems[index]?.qty || 0);
                              
                              return (
                                <div className={`flex items-center ${isInsufficient ? 'text-red-600' : 'text-green-600'}`}>
                                  <span>{stock} {selectedItem?.uom || 'units'}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        
                        <div className="flex items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Quantity to Transfer *
                            </label>
                            <input
                              {...register(`transferItems.${index}.qty`, { valueAsNumber: true })}
                              type="number"
                              step="0.001"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Enter quantity"
                            />
                            {errors.transferItems?.[index]?.qty && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.transferItems[index]?.qty?.message}
                              </p>
                            )}
                          </div>
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-gray-500 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transfer Summary */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-900 mb-2">Transfer Summary:</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <div>• Total Items: {fields.length}</div>
                  <div>• Total Quantity: {watchedItems.reduce((sum, item) => sum + (item.qty || 0), 0)}</div>
                  <div>• All items will be moved from source to destination warehouse</div>
                  <div>• Inventory ledger will be updated for both warehouses</div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Transferring...' : 'Transfer Items'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTransferModal;