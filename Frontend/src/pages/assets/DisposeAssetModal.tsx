import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, TrendingDown } from 'lucide-react';
import { assetsApi } from '../../lib/api';
import { Asset } from '../../types/api';
import toast from 'react-hot-toast';

const disposeAssetSchema = z.object({
  disposalDate: z.string().min(1, 'Disposal date is required'),
  disposalAmount: z.number().min(0, 'Disposal amount cannot be negative'),
  disposalMethod: z.enum(['SALE', 'SCRAP', 'DONATION', 'WRITE_OFF']),
  buyerDetails: z.string().optional(),
  notes: z.string().optional(),
});

type DisposeAssetFormData = z.infer<typeof disposeAssetSchema>;

interface DisposeAssetModalProps {
  asset: Asset;
  onClose: () => void;
  onSuccess: () => void;
}

const DisposeAssetModal = ({ asset, onClose, onSuccess }: DisposeAssetModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<DisposeAssetFormData>({
    resolver: zodResolver(disposeAssetSchema),
    defaultValues: {
      disposalDate: new Date().toISOString().split('T')[0],
      disposalAmount: 0,
      disposalMethod: 'SALE'
    }
  });

  const watchedMethod = watch('disposalMethod');
  const watchedAmount = watch('disposalAmount') || 0;

  const netBookValue = asset.netBookValue || asset.acquisitionCost;
  const gainLoss = watchedAmount - netBookValue;

  const onSubmit = async (data: DisposeAssetFormData) => {
    try {
      await assetsApi.disposeAsset(asset.id, data);
      toast.success('Asset disposed successfully');
      onSuccess();
    } catch (error) {
      console.error('Dispose asset error:', error);
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
                Dispose Asset: {asset.assetNo}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Asset Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <TrendingDown className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-sm text-gray-600">
                      Cost: ₦{asset.acquisitionCost.toLocaleString()} | 
                      Net Book Value: ₦{netBookValue.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Disposal Date *
                  </label>
                  <input
                    {...register('disposalDate')}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.disposalDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.disposalDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Disposal Method *
                  </label>
                  <select
                    {...register('disposalMethod')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="SALE">Sale</option>
                    <option value="SCRAP">Scrap</option>
                    <option value="DONATION">Donation</option>
                    <option value="WRITE_OFF">Write Off</option>
                  </select>
                  {errors.disposalMethod && (
                    <p className="mt-1 text-sm text-red-600">{errors.disposalMethod.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Disposal Amount *
                </label>
                <input
                  {...register('disposalAmount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
                {errors.disposalAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.disposalAmount.message}</p>
                )}
              </div>

              {watchedMethod === 'SALE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Buyer Details
                  </label>
                  <textarea
                    {...register('buyerDetails')}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Buyer name and contact information"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Disposal notes and reason"
                />
              </div>

              {/* Gain/Loss Calculation */}
              <div className={`p-4 rounded-lg ${gainLoss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <h4 className={`text-sm font-medium mb-2 ${gainLoss >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  Disposal Impact:
                </h4>
                <div className={`text-sm space-y-1 ${gainLoss >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  <div>• Net Book Value: ₦{netBookValue.toLocaleString()}</div>
                  <div>• Disposal Amount: ₦{watchedAmount.toLocaleString()}</div>
                  <div className="font-medium">
                    • {gainLoss >= 0 ? 'Gain' : 'Loss'} on Disposal: ₦{Math.abs(gainLoss).toLocaleString()}
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
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Disposing...' : 'Dispose Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisposeAssetModal;