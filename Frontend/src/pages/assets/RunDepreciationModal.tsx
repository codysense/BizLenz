import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calculator, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { assetsApi } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

const runDepreciationSchema = z.object({
  periodYear: z.number().int().min(2020).max(2050),
  periodMonth: z.number().int().min(1).max(12),
  assetIds: z.array(z.string()).optional(),
});

type RunDepreciationFormData = z.infer<typeof runDepreciationSchema>;

interface RunDepreciationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const RunDepreciationModal = ({ onClose, onSuccess }: RunDepreciationModalProps) => {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<RunDepreciationFormData>({
    resolver: zodResolver(runDepreciationSchema),
    defaultValues: {
      periodYear: new Date().getFullYear(),
      periodMonth: new Date().getMonth() + 1
    }
  });

  const { data: assetsData } = useQuery({
    queryKey: ['active-assets-for-depreciation'],
    queryFn: () => assetsApi.getAssets({ status: 'ACTIVE', limit: 100 })
  });

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAssets.length === assetsData?.assets?.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(assetsData?.assets?.map((asset: any) => asset.id) || []);
    }
  };

  const onSubmit = async (data: RunDepreciationFormData) => {
    try {
      const submitData = {
        ...data,
        assetIds: selectedAssets.length > 0 ? selectedAssets : undefined
      };
      
      const result = await assetsApi.runDepreciation(submitData);
      toast.success(`Depreciation calculated for ${result.processedAssets} assets. Total: ₦${result.totalDepreciation.toLocaleString()}`);
      onSuccess();
    } catch (error) {
      console.error('Run depreciation error:', error);
    }
  };

  const watchedYear = watch('periodYear');
  const watchedMonth = watch('periodMonth');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Run Monthly Depreciation
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Period Selection */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <Calculator className="h-5 w-5 text-blue-500 mr-2" />
                  <h4 className="text-sm font-medium text-blue-900">Depreciation Period</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Year *
                    </label>
                    <input
                      {...register('periodYear', { valueAsNumber: true })}
                      type="number"
                      min="2020"
                      max="2050"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.periodYear && (
                      <p className="mt-1 text-sm text-red-600">{errors.periodYear.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Month *
                    </label>
                    <select
                      {...register('periodMonth', { valueAsNumber: true })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2024, i, 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    {errors.periodMonth && (
                      <p className="mt-1 text-sm text-red-600">{errors.periodMonth.message}</p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-blue-800">
                  Calculating depreciation for: {new Date(watchedYear, watchedMonth - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Asset Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Select Assets (Optional)</h4>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedAssets.length === assetsData?.assets?.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="bg-yellow-50 p-3 rounded-md mb-4">
                  <p className="text-sm text-yellow-800">
                    Leave empty to run depreciation for all active assets. Select specific assets to run depreciation only for those.
                  </p>
                </div>

                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          <input
                            type="checkbox"
                            checked={selectedAssets.length === assetsData?.assets?.length && assetsData?.assets?.length > 0}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assetsData?.assets?.map((asset: any) => (
                        <tr key={asset.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedAssets.includes(asset.id)}
                              onChange={() => handleAssetToggle(asset.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{asset.assetNo}</div>
                              <div className="text-sm text-gray-500">{asset.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {asset.category?.name}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₦{asset.acquisitionCost.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <StatusBadge status={asset.depreciationMethod.replace('_', ' ')} variant="info" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 text-sm text-gray-600">
                  {selectedAssets.length > 0 
                    ? `${selectedAssets.length} assets selected`
                    : 'All active assets will be processed'
                  }
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
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
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Processing...' : 'Run Depreciation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunDepreciationModal;