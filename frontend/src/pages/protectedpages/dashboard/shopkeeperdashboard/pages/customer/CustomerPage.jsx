import React, { useState } from "react";

const CustomerPage = () => {
  const [search, setSearch] = useState("");

  // Dummy customer data (replace with API later)
  const customers = [
    { id: 1, name: "Ramesh Shrestha", phone: "9800000001", balance: 5000, status: "Active" },
    { id: 2, name: "Sita Karki", phone: "9800000002", balance: -1500, status: "Inactive" },
    { id: 3, name: "Bikash Thapa", phone: "9800000003", balance: 300, status: "Active" },
  ];

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-4">Customers</h1>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search customers..."
          className="border p-2 rounded w-full md:w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="p-3 border">Name</th>
              <th className="p-3 border">Phone</th>
              <th className="p-3 border">Balance</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((cust) => (
              <tr key={cust.id} className="hover:bg-gray-50">
                <td className="p-3 border">{cust.name}</td>
                <td className="p-3 border">{cust.phone}</td>
                <td
                  className={`p-3 border font-semibold ${
                    cust.balance < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  Rs. {cust.balance}
                </td>
                <td>
                  <span
                    className={`px-3 py-1 rounded text-white text-sm ${
                      cust.status === "Active" ? "bg-green-600" : "bg-gray-500"
                    }`}
                  >
                    {cust.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="p-3 border text-center space-x-3">
                  <button className="text-blue-600 hover:underline">View</button>
                  <button className="text-yellow-600 hover:underline">Edit</button>
                  <button className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}

            {/* If no results */}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center p-4 text-gray-500">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerPage;
