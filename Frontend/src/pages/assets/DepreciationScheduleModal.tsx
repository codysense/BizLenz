import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Calendar, TrendingDown } from 'lucide-react';
import { assetsApi } from '../../lib/api';
import { Asset, AssetDepreciation } from '../../types/api';
import { DataTable } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';

interface DepreciationScheduleModalProps {
  asset: Asset;
  onClose: () => void;
}

const DepreciationScheduleModal = ({ asset, onClose }: DepreciationScheduleModalProps) => {
  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['depreciation-schedule', asset.id],
    queryFn: () => assetsApi.getDepreciationSchedule(asset.id)
  });

  const columns = [
    {
      key: 'period',
      header: 'Period',
      cell: (entry: AssetDepreciation) => `${entry.periodYear}-${String(entry.periodMonth).padStart(2, '0')}`,
      width: 'w-24'
    },
    {
      key: 'depreciationAmount',
      header: 'Depreciation',
      cell: (entry: AssetDepreciation) => `₦${entry.depreciationAmount.toLocaleString()}`,
      width: 'w-32'
    },
    {
      key: 'accumulatedDepreciation',
      header: 'Accumulated',
      cell: (entry: AssetDepreciation) => `₦${entry.accumulatedDepreciation.toLocaleString()}`,
      width: 'w-32'
    },
    {
      key: 'netBookValue',
      header: 'Net Book Value',
      cell: (entry: AssetDepreciation) => (
        <span className="font-semibold text-blue-600">
          ₦{entry.netBookValue.toLocaleString()}
        </span>
      ),
      width: 'w-32'
    },
    {
      key: 'isPosted',
      header: 'Status',
      cell: (entry: AssetDepreciation) => (
        <StatusBadge status={entry.isPosted ? 'Posted' : 'Calculated'} />
      ),
      width: 'w-24'
    },
    {
      key: 'postedAt',
      header: 'Posted Date',
      cell: (entry: AssetDepreciation) => 
        entry.postedAt ? new Date(entry.postedAt).toLocaleDateString() : '-',
      width: 'w-32'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Depreciation Schedule: {asset.assetNo}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Asset Summary */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Asset Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Asset Name:</span>
                    <span className="font-medium">{asset.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category:</span>
                    <span className="font-medium">{asset.category?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Acquisition Date:</span>
                    <span className="font-medium">{new Date(asset.acquisitionDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Acquisition Cost:</span>
                    <span className="font-medium">₦{asset.acquisitionCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Depreciation Settings</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method:</span>
                    <span className="font-medium">{asset.depreciationMethod.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Useful Life:</span>
                    <span className="font-medium">{asset.usefulLife} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Residual Value:</span>
                    <span className="font-medium">₦{asset.residualValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current NBV:</span>
                    <span className="font-medium text-blue-600">₦{(asset.netBookValue || asset.acquisitionCost).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Depreciation Schedule */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Depreciation History
              </h4>
              
              <DataTable
                data={scheduleData?.schedule || []}
                columns={columns}
                loading={isLoading}
              />
            </div>
            
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

export default DepreciationScheduleModal;