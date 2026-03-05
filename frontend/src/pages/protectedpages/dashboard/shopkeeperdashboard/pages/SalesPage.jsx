import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiLoader, FiPlus, FiTrash2, FiPrinter, FiCheck } from "react-icons/fi";
import api from "../../../../../api/axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

/**
 * SalesPage - Offline POS for shopkeepers
 * - Select customer (from connected customers)
 * - Add multiple products
 * - Auto-calculate price
 * - Apply discount
 * - Print invoice
 */

const SalesPage = () => {
  const queryClient = useQueryClient();
  const invoiceRef = useRef(null);

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]); // [{product, quantity}]
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [initialPayment, setInitialPayment] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [error, setError] = useState("");

  // Fetch connected customers
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["connectedCustomers"],
    queryFn: async () => {
      const res = await api.get(`${BACKEND_URL}/accounts/shopkeeper/connected-customers/`);
      return res.data.customers || [];
    },
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["shopkeeperProducts"],
    queryFn: async () => {
      const res = await api.get(`${BACKEND_URL}/products/products/?page_size=1000`);
      return res.data.results || [];
    },
  });

  const customers = customersData || [];
  const products = productsData || [];

  // Calculate totals
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discount) / 100;
  }, [subtotal, discount]);

  const totalAmount = useMemo(() => {
    return subtotal - discountAmount;
  }, [subtotal, discountAmount]);

  // Add product to cart
  const addToCart = (product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      setCart(cart.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  // Update quantity
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.product.id !== productId));
    } else {
      setCart(cart.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock) }
          : item
      ));
    }
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const items = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const res = await api.post(`${BACKEND_URL}/orders/create-order/`, {
        customer_id: selectedCustomer.id,
        items,
        payment_method: paymentMethod,
        order_type: "offline",
        initial_payment: paymentMethod === "credit" ? parseFloat(initialPayment || 0) : totalAmount,
        discount_percent: discount,
      });

      return res.data;
    },
    onSuccess: (data) => {
      setLastOrder({
        ...data,
        customer: selectedCustomer,
        items: cart,
        subtotal,
        discount,
        discountAmount,
        totalAmount,
        paymentMethod,
        initialPayment: paymentMethod === "credit" ? parseFloat(initialPayment || 0) : totalAmount,
        date: new Date(),
      });
      setShowInvoice(true);
      setCart([]);
      setDiscount(0);
      setInitialPayment("");
      queryClient.invalidateQueries(["shopkeeperOrders"]);
      queryClient.invalidateQueries(["shopkeeperProducts"]);
      queryClient.invalidateQueries(["shopkeeperDashboard"]);
    },
    onError: (err) => {
      setError(err.response?.data?.error || err.response?.data?.detail || "Failed to create order");
    },
  });

  // Handle submit
  const handleSubmit = () => {
    setError("");

    if (!selectedCustomer) {
      setError("Please select a customer");
      return;
    }

    if (cart.length === 0) {
      setError("Please add at least one product");
      return;
    }

    if (paymentMethod === "credit" && parseFloat(initialPayment || 0) > totalAmount) {
      setError("Initial payment cannot exceed total amount");
      return;
    }

    createOrderMutation.mutate();
  };

  // Print invoice
  const printInvoice = () => {
    const content = invoiceRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 18px; }
            .header p { margin: 5px 0; color: #666; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 5px 0; text-align: left; }
            th { border-bottom: 1px solid #000; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; font-size: 14px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (customersLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FiLoader className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Point of Sale</h1>
        <p className="text-sm text-gray-500 mt-1">Create offline sales for walk-in customers</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow border p-4">
            <h2 className="font-semibold text-gray-800 mb-4">Products</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
              {products.filter(p => p.stock > 0).map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition text-left"
                >
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-16 object-cover rounded mb-2" />
                  ) : (
                    <div className="w-full h-16 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-400 text-xs">
                      No img
                    </div>
                  )}
                  <div className="text-sm font-medium truncate">{product.name}</div>
                  <div className="text-xs text-gray-500">Stock: {product.stock}</div>
                  <div className="text-sm font-semibold text-green-600">Rs {product.selling_price}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border p-4 sticky top-4">
            <h2 className="font-semibold text-gray-800 mb-4">Cart</h2>

            {/* Customer Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={selectedCustomer?.id || ""}
                onChange={(e) => {
                  const customer = customers.find((c) => c.id === parseInt(e.target.value));
                  setSelectedCustomer(customer || null);
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items */}
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {cart.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No items in cart</div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.product.name}</div>
                      <div className="text-xs text-gray-500">Rs {item.product.selling_price} each</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"
                      >
                        <FiTrash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="credit">Credit (Loan)</option>
              </select>
            </div>

            {/* Initial Payment for Credit */}
            {paymentMethod === "credit" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Payment (Rs)</label>
                <input
                  type="number"
                  min="0"
                  value={initialPayment}
                  onChange={(e) => setInitialPayment(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="0"
                />
              </div>
            )}

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>Rs {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({discount}%)</span>
                  <span>- Rs {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>Rs {totalAmount.toFixed(2)}</span>
              </div>
              {paymentMethod === "credit" && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Amount Due</span>
                  <span>Rs {(totalAmount - parseFloat(initialPayment || 0)).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending || cart.length === 0}
              className="w-full mt-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createOrderMutation.isPending ? (
                <>
                  <FiLoader className="animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <FiCheck /> Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && lastOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">Invoice</h3>
              <div className="flex gap-2">
                <button
                  onClick={printInvoice}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-1"
                >
                  <FiPrinter /> Print
                </button>
                <button
                  onClick={() => setShowInvoice(false)}
                  className="px-3 py-1 bg-gray-100 rounded text-sm"
                >
                  Close
                </button>
              </div>
            </div>

            <div ref={invoiceRef} className="p-4">
              <div className="header text-center mb-4">
                <h1 className="text-xl font-bold">INVOICE</h1>
                <p className="text-sm text-gray-500">Order #{lastOrder.order_id}</p>
                <p className="text-sm text-gray-500">{lastOrder.date.toLocaleString()}</p>
              </div>

              <div className="divider border-t border-dashed my-3" />

              <div className="mb-3">
                <p className="text-sm"><strong>Customer:</strong> {lastOrder.customer?.name}</p>
                <p className="text-sm text-gray-500">{lastOrder.customer?.email}</p>
              </div>

              <div className="divider border-t border-dashed my-3" />

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Item</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Price</th>
                    <th className="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lastOrder.items.map((item) => (
                    <tr key={item.product.id}>
                      <td className="py-1">{item.product.name}</td>
                      <td className="text-center py-1">{item.quantity}</td>
                      <td className="text-right py-1">Rs {item.product.selling_price}</td>
                      <td className="text-right py-1">Rs {(item.product.selling_price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="divider border-t border-dashed my-3" />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>Rs {lastOrder.subtotal.toFixed(2)}</span>
                </div>
                {lastOrder.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({lastOrder.discount}%)</span>
                    <span>- Rs {lastOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>Rs {lastOrder.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method</span>
                  <span className="capitalize">{lastOrder.paymentMethod}</span>
                </div>
                {lastOrder.paymentMethod === "credit" && (
                  <>
                    <div className="flex justify-between">
                      <span>Paid</span>
                      <span>Rs {lastOrder.initialPayment.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Due</span>
                      <span>Rs {(lastOrder.totalAmount - lastOrder.initialPayment).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="divider border-t border-dashed my-3" />

              <div className="footer text-center text-xs text-gray-500">
                <p>Thank you for your purchase!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
