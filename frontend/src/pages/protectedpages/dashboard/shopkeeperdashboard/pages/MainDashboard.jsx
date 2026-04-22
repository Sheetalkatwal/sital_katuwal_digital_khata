import React from 'react';
import StatCard from '../components/dashboard/StatCard';
import ChartCard from '../components/dashboard/ChartCard';
import RecentInvoiceTable from '../components/dashboard/RecentInvoiceTable';
import StockHistoryCard from '../components/dashboard/StockHistoryCard';
import StockAlertCard from '../components/dashboard/StockAlertCard';
import HeroProduct from '../components/dashboard/HeroProduct';
import FrequentlyCustomer from '../components/dashboard/FrequentlyCustomer';

const MainDashboard = () => {
  return (
    <div className="p-6 bg-gray-100 min-h-screen">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Insights, analytics & key metrics</p>
      </div>

      {/* Stats Row */}
      <div className="mb-8 p-4">
        <StatCard />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT MAIN COLUMN */}
        <div className="xl:col-span-2 space-y-6">

          {/* Top Big Chart */}
          <div className="bg-white rounded-xl shadow border p-4">
            <ChartCard />
          </div>

          {/* Stock History */}
          <StockHistoryCard />

          {/* Recent Invoices */}
          <RecentInvoiceTable />
        </div>

        {/* RIGHT SIDEBAR COLUMN */}
        <div className="space-y-6">

          {/* Alerts */}
          <StockAlertCard />

          {/* Customers */}
          <FrequentlyCustomer />

          {/* Hero Products */}
          <HeroProduct />
        </div>

      </div>
    </div>
  );
};

export default MainDashboard;
