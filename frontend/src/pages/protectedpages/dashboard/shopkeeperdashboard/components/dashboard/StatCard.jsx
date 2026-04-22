import { useQuery } from "@tanstack/react-query";
import { fetchShopkeeperDashboard } from "../../../../../../api/Dashboard";
import { FiLoader, FiUsers, FiPackage, FiDollarSign, FiAlertTriangle, FiClock, FiCreditCard } from "react-icons/fi";

export default function StatCard() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["shopkeeperDashboard"],
        queryFn: fetchShopkeeperDashboard,
    });

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow flex justify-center items-center h-32">
                <FiLoader className="w-6 h-6 animate-spin text-green-600" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-white rounded-xl shadow flex justify-center items-center h-32 text-red-500">
                Failed to load stats
            </div>
        );
    }

    const stats = [
        { 
            label: 'Total Revenue', 
            value: `Rs ${(data?.total_revenue || 0).toLocaleString()}`,
            icon: FiDollarSign,
            color: 'text-green-600 bg-green-100'
        },
        { 
            label: 'Total Customers', 
            value: data?.total_customers || 0,
            icon: FiUsers,
            color: 'text-blue-600 bg-blue-100'
        },
        { 
            label: 'Total Products', 
            value: data?.total_products || 0,
            icon: FiPackage,
            color: 'text-purple-600 bg-purple-100'
        },
        { 
            label: 'Pending Orders', 
            value: data?.pending_orders || 0,
            icon: FiClock,
            color: 'text-yellow-600 bg-yellow-100'
        },
        { 
            label: 'Low Stock Items', 
            value: data?.low_stock || 0,
            icon: FiAlertTriangle,
            color: 'text-red-600 bg-red-100'
        },
        { 
            label: 'Outstanding', 
            value: `Rs ${(data?.outstanding_receivables || 0).toLocaleString()}`,
            icon: FiCreditCard,
            color: 'text-orange-600 bg-orange-100'
        },
    ];

    return (
        <div className="bg-white rounded-xl shadow grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4">
            {stats.map((stat) => (
                <div key={stat.label} className="text-center border px-4 py-4 rounded-lg hover:shadow-md transition">
                    <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${stat.color} mb-2`}>
                        <stat.icon className="w-5 h-5" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
            ))}
        </div>
    );
}