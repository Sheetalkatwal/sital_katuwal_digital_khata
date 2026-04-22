import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchConnectedShops } from "../../../../../../api/ConnectedShops";
import reactPhoto from "../../../../../../assets/react.svg";




const ShopList = () => {
  // Use TanStack Query to fetch connected shops
  const { data: shops = [], isLoading, error } = useQuery({
    queryKey: ["connectedShops"],
    queryFn: fetchConnectedShops,
  });

  const [showMap, setShowMap] = useState(false);
  const [mapShop, setMapShop] = useState(null);

  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const filtered = useMemo(() => {
    if (!q) return shops;
    const term = q.trim().toLowerCase();
    return shops.filter((s) => {
      const name = (s.business_name || s.name || '').toString().toLowerCase();
      const owner = (s.owner_name || s.ownerName || '').toString().toLowerCase();
      return name.includes(term) || owner.includes(term);
    });
  }, [q, shops]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleViewProducts = (shop) => navigate(`/dashboard/customer/shops/${shop.id}/products`);
  const handleViewOrders = (shop) => navigate(`/dashboard/customer/shops/${shop.id}/orders`);
  const handleViewCarts = (shop) => navigate(`/dashboard/customer/shops/${shop.id}/carts`);

  if (isLoading) return <div>Loading connected shops...</div>;
  if (error) return <div className="text-red-500">Failed to load connected shops.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">Shops</h3>
        <div className="flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search shops..."
            className="border border-gray-200 rounded-md px-3 py-2 text-sm w-64"
          />
          <div className="text-sm text-gray-500">{total} items</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((shop) => (
          <div key={shop.id} className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition flex flex-col">
            <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center">
              <div className="text-gray-300 text-xl">
                <img src={reactPhoto} alt="Shop" className="h-20 w-20 object-contain opacity-70" />
              </div>
            </div>

            <div className="p-3 flex-1 flex flex-col">
              <div className="text-sm font-medium text-gray-900 truncate">{shop.business_name || shop.name}</div>
              <div className="mt-1 text-xs text-gray-500">Owner: {shop.owner_name || shop.ownerName}</div>
              {shop.description && <div className="mt-2 text-xs text-gray-600 line-clamp-2">{shop.description}</div>}
              

              <div className="mt-3 flex flex-col gap-4 justify-between">
                <div className="flex gap-4">
                  <button className="px-4 py-2 text-sm rounded bg-neutral-200 text-neutral-800 hover:bg-neutral-300 transition" onClick={() => {setMapShop(shop); setShowMap(true)}}>View</button>
                  <button className="px-4 py-2 text-sm rounded bg-neutral-200 text-neutral-800 hover:bg-neutral-300 transition" onClick={() => handleViewOrders(shop)}>Orders</button>
                </div>
                <div className="flex gap-4">
                  <button className="px-4 py-2 text-sm rounded bg-neutral-700 text-white hover:bg-neutral-800 transition" onClick={() => handleViewProducts(shop)}>Products</button>
                  <button className="px-4 py-2 text-sm rounded bg-neutral-200 text-neutral-800 hover:bg-neutral-300 transition" onClick={() => handleViewCarts(shop)}>Cart</button>
                </div>
              </div>

</div>
</div>
        ))}
      </div>

      {/* inline Google Maps modal */}
      {showMap && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white w-[95vw] max-w-3xl rounded shadow-lg overflow-hidden">
            <div className="p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{mapShop.business_name || mapShop.name}</div>
                <div className="text-xs text-gray-500">{mapShop.owner_name || mapShop.ownerName}</div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`https://www.google.com/maps?q=${mapShop.lat},${mapShop.lng}`} target="_blank" rel="noreferrer" className="px-3 py-1 bg-green-600 text-white rounded">Open in Google Maps</a>
                <button onClick={()=> setShowMap(false)} className="px-3 py-1 bg-gray-100 rounded">Close</button>
              </div>
            </div>
            <div className="w-full h-80">
              <iframe
                title="shop-map"
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://www.google.com/maps?q=${mapShop.lat},${mapShop.lng}&z=15&output=embed`}
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50">Prev</button>
        <div className="text-sm text-gray-600">{page} / {totalPages}</div>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50">Next</button>
      </div>
    </div>
  );
};

export default ShopList;