import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import OrderModal from '../orders/OrderModal';
import { fetchProductsByShop } from '../../../../../../api/Products';
import { addToCart } from '../../../../../../api/Carts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiShoppingCart, FiCheck, FiLoader } from 'react-icons/fi';

const BACKEND_URL = 'http://localhost:8000/'

const ProductList = ({ products: initial = null }) => {

    const { shopId } = useParams();
    const queryClient = useQueryClient();
    const [products, setProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [cartSuccess, setCartSuccess] = useState(false);
    const pageSize = 12;
    const navigate = useNavigate();

    const mutation = useMutation({
        queryKey: ['fetchProductsByShop', shopId],
        mutationFn: () => fetchProductsByShop(shopId),
        onSuccess: (data) => setProducts(data),
        onError: (err) => console.error(err)
    });

    // Add to cart mutation
    const addToCartMutation = useMutation({
        mutationFn: ({ shopId, items }) => addToCart(shopId, items),
        onSuccess: () => {
            queryClient.invalidateQueries(['carts']);
            queryClient.invalidateQueries(['cartByShop', shopId]);
            setSelectedProducts({});
            setCartSuccess(true);
            setTimeout(() => setCartSuccess(false), 3000);
        },
        onError: (err) => {
            alert(`Failed to add to cart: ${err.response?.data?.error || err.message}`);
        }
    });

    const handleAddToCart = (product) => {
        // Add single product to cart
        const items = [{ product_id: product.id, quantity: 1 }];
        addToCartMutation.mutate({ shopId: parseInt(shopId), items });
    };

    const handleAddSelectedToCart = () => {
        const selectedItems = Object.values(selectedProducts);
        if (selectedItems.length === 0) return;

        const items = selectedItems.map(p => ({
            product_id: p.id,
            quantity: p.quantity || 1
        }));

        addToCartMutation.mutate({ shopId: parseInt(shopId), items });
    };

    const handleViewProduct = (product) => {
        navigate(`/dashboard/customer/shops/${shopId}/products/${product.id}/detail`)
    }

    const handleViewCart = () => {
        navigate(`/dashboard/customer/shops/${shopId}/carts`);
    }

    useEffect(() => mutation.mutate(), [shopId]);

    const dataSource = (products && products.results) ? products.results : (Array.isArray(products) ? products : []);

    const filtered = useMemo(() => {
        if (!searchQuery) return dataSource;
        const term = searchQuery.trim().toLowerCase();
        return dataSource.filter(p => (p.name || '').toLowerCase().includes(term));
    }, [searchQuery, dataSource]);

    const total = products?.count ?? filtered.length;
    const totalPages = products?.count ? Math.ceil(products.count / pageSize) : Math.ceil(total / pageSize);

    const items = filtered.map(p => ({
        ...p,
        price: Number(p.selling_price || p.price || 0),
        stocks: p.stocks ?? p.stock ?? 0,
        image: p.image || null,
    }));

    const handleSelectProduct = (product, checked) => {
        const newSelected = { ...selectedProducts };
        if (checked) {
            newSelected[product.id] = { ...product, quantity: 1 };
        } else {
            delete newSelected[product.id];
        }
        setSelectedProducts(newSelected);
    };

    const handleQuantityChange = (productId, value) => {
        const newSelected = { ...selectedProducts };
        if (newSelected[productId]) {
            newSelected[productId].quantity = Math.min(Math.max(1, Number(value)), newSelected[productId].stocks);
            setSelectedProducts(newSelected);
        }
    };

    const handleOrderBulk = () => {
        console.log("this is selected products",selectedProducts);

        if (Object.keys(selectedProducts).length === 0) return;
        const selectedItems = Object.values(selectedProducts);
        console.log("shop id in product list",shopId);
        navigate("/dashboard/customer/orders/checkout", { state: { products: selectedItems, shopId } });
    };

    const handleModalClose = () => setShowModal(false);

    return (
        <div className="space-y-4">
            {/* Header & Search */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">Products</h3>
                <div className="flex items-center gap-3">
                    <input
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        placeholder="Search products"
                        className="border border-gray-200 rounded-md px-3 py-2 text-sm w-64"
                    />
                    <div className="text-sm text-gray-500">{total} items</div>
                </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {items.map(p => (
                    <div key={p.id} className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition flex flex-col h-full">
                        <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center">
                            {p.image ? (
                                <img src={`${BACKEND_URL}${p.image}`} alt={p.name} className="h-20 w-20 object-contain" />
                            ) : (
                                <div className="text-gray-300 text-xl">No Image</div>
                            )}
                        </div>

                        <div className="p-3 flex-1 flex flex-col space-y-2">
                            <div className="text-sm font-medium text-green-900 truncate">{p.name}</div>
                            <div className="flex items-baseline gap-2">
                                <div className="text-lg font-semibold text-green-600">Rs {p.price.toFixed(0)}</div>
                            </div>
                            <div className="text-xs text-gray-500">Stock: {p.stocks}</div>

                            {/* Selection & Quantity */}
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    checked={!!selectedProducts[p.id]}
                                    onChange={(e) => handleSelectProduct(p, e.target.checked)}
                                />
                                <span className="text-sm text-gray-700">Select</span>
                                {selectedProducts[p.id] && (
                                    <input
                                        type="number"
                                        min={1}
                                        max={p.stocks}
                                        value={selectedProducts[p.id].quantity}
                                        onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                                        className="ml-2 w-16 border px-2 py-1 text-sm rounded"
                                    />
                                )}
                            </div>

                            {/* Actions */}
                            <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                                <button
                                    onClick={() => handleAddToCart(p)}
                                    disabled={addToCartMutation.isPending}
                                    className="px-3 py-2 text-xs sm:text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                    <FiShoppingCart className="w-3 h-3" />
                                    Add Cart
                                </button>
                                <button className='px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded text-gray-700 hover:bg-gray-50' onClick={()=>handleViewProduct(p)}>View</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2">
                <button
                    onClick={async () => {
                        if (products?.previous) {
                            const res = await fetch(products.previous);
                            const data = await res.json();
                            setProducts(data);
                            setPage(p => Math.max(1, p - 1));
                        }
                    }}
                    disabled={!products?.previous}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50"
                >
                    Prev
                </button>
                <div className="text-sm text-gray-600">{page} / {totalPages}</div>
                <button
                    onClick={async () => {
                        if (products?.next) {
                            const res = await fetch(products.next);
                            const data = await res.json();
                            setProducts(data);
                            setPage(p => p + 1);
                        }
                    }}
                    disabled={!products?.next}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50"
                >
                    Next
                </button>
            </div>

            {/* Success Toast */}
            {cartSuccess && (
                <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-pulse">
                    <FiCheck className="w-5 h-5" />
                    <span>Added to cart successfully!</span>
                    <button
                        onClick={handleViewCart}
                        className="ml-2 underline hover:no-underline"
                    >
                        View Cart
                    </button>
                </div>
            )}

            {/* Bulk Actions */}
            {Object.keys(selectedProducts).length > 0 && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg p-4 rounded-lg border flex items-center gap-3 z-40">
                    <div className="text-sm font-semibold">{Object.keys(selectedProducts).length} items selected</div>
                    <button
                        onClick={handleOrderBulk}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Buy Selected Now
                    </button>
                    <button
                        onClick={handleAddSelectedToCart}
                        disabled={addToCartMutation.isPending}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {addToCartMutation.isPending ? (
                            <>
                                <FiLoader className="w-4 h-4 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <FiShoppingCart className="w-4 h-4" />
                                Add Selected to Cart
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleViewCart}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                        View Cart
                    </button>
                </div>
            )}

            {showModal && (
                <OrderModal
                    success={() => setShowModal(false)}
                    modalClose={handleModalClose}
                    product={Object.values(selectedProducts)}
                />
            )}
        </div>
    )
}

export default ProductList;
