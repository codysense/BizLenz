import React from "react";
import { X } from "lucide-react";

interface JournalLine {
  id: string;
  account: {
    name: string;
    code?: string;
  };
  debit: number;
  credit: number;
}

interface JournalDetail {
  id: string;
  journalDate: string;
  note?: string;
  reference?: string;
  journalLines: JournalLine[];
}

interface DetailJournalModalProps {
  journal: JournalDetail;
  onClose: () => void;
}

const DetailJournalModal = ({ journal, onClose }: DetailJournalModalProps) => {
  const calculateDebitTotal = () => {
    return journal.journalLines.reduce((sum, line) => {
      return sum + (line.debit || 0);
    }, 0);
  };

  const calculateCreditTotal = () => {
    return journal.journalLines.reduce((sum, line) => {
      return sum + (line.credit || 0);
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Journal Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Journal Header Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(journal.journalDate).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Reference</p>
                <p className="text-sm font-medium text-gray-900">
                  {journal.reference || "—"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Note</p>
                <p className="text-sm font-medium text-gray-900">
                  {journal.note || "—"}
                </p>
              </div>
            </div>

            {/* Journal Lines */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Journal Entries
              </h4>

              <div className="space-y-4">
                {journal.journalLines.map((line) => (
                  <div key={line.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                      {/* Account */}
                      <div className="sm:col-span-2">
                        <p className="text-sm text-gray-500">
                          Chart of Account
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {line.account.code && `${line.account.code} - `}
                          {line.account.name}
                        </p>
                      </div>

                      {/* Debit */}
                      <div>
                        <p className="text-sm text-gray-500">Debit</p>
                        <p className="text-sm font-medium text-red-600">
                          ₦{(line.debit || 0).toLocaleString()}
                        </p>
                      </div>

                      {/* Credit */}
                      <div>
                        <p className="text-sm text-gray-500">Credit</p>
                        <p className="text-sm font-medium text-blue-600">
                          ₦{(line.credit || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">
                    Total Debit:
                  </span>
                  <span className="text-2xl font-bold text-red-600">
                    ₦{calculateDebitTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">
                    Total Credit:
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₦{calculateCreditTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
              <button
                type="button"
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

export default DetailJournalModal;
