import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShopkeeperOrders, updateOrderStatus } from "../../../../../../api/Orders";
import { FiLoader, FiPackage } from "react-icons/fi";

/**
 * ShopkeeperOrderList.jsx
 * - Modern card layout with good spacing and hierarchy
 * - Sticky filter bar
 * - Search + status + sort + per-page controls
 * - Action buttons with confirm flows
 * - Real API integration
 */

// status -> tailwind classes
const STATUS_STYLE = {
  pending: "bg-yellow-50 text-yellow-800 ring-yellow-200",
  confirmed: "bg-blue-50 text-blue-800 ring-blue-200",
  shipped: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  delivered: "bg-purple-50 text-purple-800 ring-purple-200",
  completed: "bg-green-50 text-green-800 ring-green-200",
  cancelled: "bg-red-50 text-red-800 ring-red-200",
  paid: "bg-teal-50 text-teal-800 ring-teal-200",
  failed: "bg-red-50 text-red-800 ring-red-200",
};

// small helper icon (chevron)
const Chevron = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// motion variants
const listContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
const listItem = { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.18 } } };

// Get next action for an order
const getNextAction = (status) => {
  switch (status?.toLowerCase()) {
    case "pending": return { action: "accept", label: "Accept", color: "bg-blue-600" };
    case "paid": return { action: "accept", label: "Accept & Process", color: "bg-teal-600" };
    case "confirmed": return { action: "shipped", label: "Mark Shipped", color: "bg-indigo-600" };
    case "shipped": return { action: "delivered", label: "Mark Delivered", color: "bg-purple-600" };
    case "delivered": return { action: "complete", label: "Complete", color: "bg-green-600" };
    default: return null;
  }
};

export default function OrderListEnhanced() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("date_desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [confirmAction, setConfirmAction] = useState(null);

  // Fetch orders from API
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["shopkeeperOrders"],
    queryFn: () => fetchShopkeeperOrders(),
  });

  // Update order status mutation
  const statusMutation = useMutation({
    mutationFn: ({ orderId, action }) => updateOrderStatus(orderId, action),
    onSuccess: () => {
      queryClient.invalidateQueries(["shopkeeperOrders"]);
      setConfirmAction(null);
    },
    onError: (err) => {
      alert(`Failed to update order: ${err.response?.data?.error || err.message}`);
      setConfirmAction(null);
    },
  });

  const orders = data?.orders || [];

  // filtered + sorted
  const filtered = useMemo(() => {
    let filteredData = [...orders];

    // search
    if (query.trim()) {
      const q = query.toLowerCase();
      filteredData = filteredData.filter((o) =>
        o.customer_name?.toLowerCase().includes(q) ||
        String(o.order_id).includes(q)
      );
    }

    // status filter
    if (statusFilter !== "All") {
      filteredData = filteredData.filter((o) => o.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    // sort
    if (sortBy === "date_desc") filteredData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortBy === "date_asc") filteredData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (sortBy === "amount_desc") filteredData.sort((a, b) => b.total_amount - a.total_amount);
    if (sortBy === "amount_asc") filteredData.sort((a, b) => a.total_amount - b.total_amount);

    return filteredData;
  }, [orders, query, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  // actions
  function handleAction(orderId, action) {
    setConfirmAction({ action, orderId });
  }

  function performConfirm() {
    if (!confirmAction) return;
    statusMutation.mutate({ orderId: confirmAction.orderId, action: confirmAction.action });
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FiLoader className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading orders...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error loading orders: {error.message}</p>
      </div>
    );
  }

  function renderEmpty() {
    return (
      <div className="bg-white rounded-lg p-8 shadow border text-center">
        <FiPackage className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <div className="text-gray-500 text-lg mb-2">No orders found</div>
        <div className="text-sm text-gray-400">Try clearing filters or search for a different order.</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage orders — filter, sort and take quick actions.</p>
        </div>

        <div className="text-sm text-gray-600">{filtered.length} result(s)</div>
      </div>

      {/* sticky filter bar */}
      <div className="sticky top-4 z-10">
        <div className="bg-white border rounded-lg shadow-sm p-4 flex flex-col md:flex-row gap-3 md:gap-4 items-center">
          <div className="flex-1 min-w-0">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search by customer name or order ID"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="pl-3 pr-8 py-2 border rounded-lg bg-white text-sm"
                >
                  <option value="All">All</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Chevron /></div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="pl-3 pr-3 py-2 border rounded-lg text-sm">
                <option value="date_desc">Newest</option>
                <option value="date_asc">Oldest</option>
                <option value="amount_desc">Amount (high)</option>
                <option value="amount_asc">Amount (low)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Per page</label>
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="pl-3 pr-3 py-2 border rounded-lg text-sm">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* list */}
      <motion.div initial="hidden" animate="visible" variants={listContainer} className="mt-6 space-y-4">
        {pageData.length === 0 ? renderEmpty() : null}

        {pageData.map((o) => {
          const nextAction = getNextAction(o.status);
          return (
            <motion.div key={o.order_id} variants={listItem} whileHover={{ y: -4 }} className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {/* left section */}
              <div className="flex items-start gap-4 min-w-0">
                <div className="flex-shrink-0 w-36">
                  <div className="text-xs text-gray-400">Order</div>
                  <div className="font-medium">#{o.order_id}</div>
                  <div className="text-xs text-gray-400">{formatDate(o.created_at)}</div>
                </div>

                <div className="min-w-0">
                  <div className="font-semibold truncate">{o.customer_name || "Unknown Customer"}</div>
                  <div className="text-sm text-gray-500">
                    Items: {o.items?.length || 0} • {o.payment_method?.toUpperCase()}
                  </div>
                  {o.customer_address && (
                    <div className="text-sm text-gray-400 mt-1 truncate">{o.customer_address}</div>
                  )}
                </div>
              </div>

              {/* right section */}
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ring-1 ${STATUS_STYLE[o.status?.toLowerCase()] || "bg-gray-50 text-gray-800 ring-gray-100"}`}>
                  {o.status}
                </div>

                <div className="text-right min-w-[96px]">
                  <div className="text-lg font-semibold">Rs {o.total_amount?.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">Total</div>
                  {o.amount_due > 0 && (
                    <div className="text-xs text-red-500">Due: Rs {o.amount_due?.toFixed(2)}</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {nextAction && (
                    <button
                      onClick={() => handleAction(o.order_id, nextAction.action)}
                      className={`px-3 py-1 text-sm ${nextAction.color} text-white rounded-md hover:brightness-95`}
                    >
                      {nextAction.label}
                    </button>
                  )}

                  {o.status?.toLowerCase() !== "cancelled" && o.status?.toLowerCase() !== "completed" && (
                    <button
                      onClick={() => handleAction(o.order_id, "cancel")}
                      className="px-3 py-1 text-sm border rounded-md text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* pagination */}
      {filtered.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} of {filtered.length}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Prev
            </button>

            <div className="hidden sm:flex items-center gap-1 border rounded px-2 py-1">
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const idx = i + 1;
                const active = idx === page;
                return (
                  <button
                    key={idx}
                    onClick={() => setPage(idx)}
                    className={`px-3 py-1 rounded text-sm ${active ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                  >
                    {idx}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="px-2 text-gray-400">...</span>}
            </div>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* confirm modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmAction(null)} />
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold">Confirm action</h3>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to <span className="font-medium">{confirmAction.action}</span> order{" "}
              <span className="font-medium">#{confirmAction.orderId}</span>?
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 border rounded">
                Cancel
              </button>
              <button
                onClick={performConfirm}
                disabled={statusMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {statusMutation.isPending ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
