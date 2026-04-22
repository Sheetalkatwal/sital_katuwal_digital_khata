import React from 'react';

const StockHistoryCard = () => (
  <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
    <h2 className="text-lg font-semibold mb-2 text-gray-900">Stock History</h2>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-xs text-gray-500">Total Sales Items</div>
        <div className="text-xl font-bold text-gray-900">210</div>
        <div className="text-xs text-green-600">+20% this week</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Total Purchase Items</div>
        <div className="text-xl font-bold text-gray-900">500</div>
        <div className="text-xs text-green-600">+20% this week</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Sales Return Items</div>
        <div className="text-xl font-bold text-gray-900">2</div>
        <div className="text-xs text-red-600">-45%</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Purchase Return Items</div>
        <div className="text-xl font-bold text-gray-900">10</div>
        <div className="text-xs text-red-600">-65%</div>
      </div>
    </div>
  </div>
);

export default StockHistoryCard;
