import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Package } from 'lucide-react';
import { productionApi } from '../../lib/api';
import { ProductionOrder } from '../../types/api';
import toast from 'react-hot-toast';

const receiveFinishedGoodsSchema = z.object({
  qtyGood: z.number().positive('Good quantity must be positive'),
  qtyScrap: z.number().min(0, 'Scrap quantity cannot be negative').default(0),
});

type ReceiveFinishedGoodsFormData = z.infer<typeof receiveFinishedGoodsSchema>;

interface ReceiveFinishedGoodsModalProps {
  order: ProductionOrder;
  onClose: () => void;
  onSuccess: () => void;
}

const ReceiveFinishedGoodsModal = ({ order, onClose, onSuccess }: ReceiveFinishedGoodsModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ReceiveFinishedGoodsFormData>({
    resolver: zodResolver(receiveFinishedGoodsSchema),
    defaultValues: {
      qtyGood: Number(order.qtyTarget) - Number(order.qtyProduced),
      qtyScrap: 0
    }
  });

  const watchedGood = watch('qtyGood') || 0;
  const watchedScrap = watch('qtyScrap') || 0;
  const totalProduced = watchedGood + watchedScrap;
  const remainingQty = Number(order.qtyTarget) - Number(order.qtyProduced);

  const onSubmit = async (data: ReceiveFinishedGoodsFormData) => {
    try {
      await productionApi.receiveFinishedGoods(order.id, data);
      toast.success('Finished goods received successfully');
      onSuccess();
    } catch (error) {
      console.error('Receive finished goods error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Receive Finished Goods: {order.orderNo}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Order Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <div className="font-medium">{order.item.name}</div>
                    <div className="text-sm text-gray-600">
                      Target: {order.qtyTarget} | Produced: {order.qtyProduced} | Remaining: {remainingQty}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Good Quantity *
                  </label>
                  <input
                    {...register('qtyGood', { valueAsNumber: true })}
                    type="number"
                    step="0.001"
                    max={remainingQty}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="100.00"
                  />
                  {errors.qtyGood && (
                    <p className="mt-1 text-sm text-red-600">{errors.qtyGood.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Scrap Quantity
                  </label>
                  <input
                    {...register('qtyScrap', { valueAsNumber: true })}
                    type="number"
                    step="0.001"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0.00"
                  />
                  {errors.qtyScrap && (
                    <p className="mt-1 text-sm text-red-600">{errors.qtyScrap.message}</p>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Good Units:</span>
                    <span className="font-medium">{watchedGood}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Scrap Units:</span>
                    <span className="font-medium">{watchedScrap}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Total Produced:</span>
                    <span className="font-medium">{totalProduced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Yield %:</span>
                    <span className="font-medium">
                      {totalProduced > 0 ? ((watchedGood / totalProduced) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
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
                  {isSubmitting ? 'Receiving...' : 'Receive Finished Goods'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveFinishedGoodsModal;