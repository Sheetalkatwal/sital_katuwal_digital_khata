import React from 'react';

const alerts = [
  { product: 'iPad Pro 2017 Model', qty: 32 },
  { product: 'DJI Mavic Pro 2', qty: 43 },
  { product: 'Tesla Model S', qty: 21 },
  { product: 'Lego StarWar edition', qty: 12 },
  { product: 'Dell Computer Monitor', qty: 16 },
  { product: 'Google Pixel', qty: 14 },
  { product: 'Microsoft Surface', qty: 14 },
  { product: 'Amazon Kindle', qty: 27 },
];

const StockAlertCard = () => (
  <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
    <h2 className="text-lg font-semibold mb-2 text-gray-900">Stock Alert</h2>
    <ul className="divide-y divide-gray-100">
      {alerts.map(a => (
        <li key={a.product} className="py-2 flex justify-between text-gray-700">
          <span>{a.product}</span>
          <span className="font-bold">{a.qty}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default StockAlertCard;
