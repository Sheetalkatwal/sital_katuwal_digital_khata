import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import api from '../../../../../../api/axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000/";

L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
})

const MAX_RADIUS_KM = 5

function distanceKm(lat1, lon1, lat2, lon2){
    const toRad = v => v * Math.PI / 180
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
}

const ClickHandler = ({onClick})=>{
    useMapEvents({
        click(e){ onClick(e.latlng) }
    })
    return null
}

const ManageCheckout = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    console.log("Checkout state:", state);

    useEffect(() => {
        if (!state || !state.products) {
            navigate('/dashboard/customer/shops');
        }
    }, [state, navigate]);

    if (!state || !state.products) return null;

    const products = state.products || []
    const totalPrice = products.reduce((s,p) => s + (Number(p.price || 0) * Number(p.quantity || 1)), 0)


    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [error, setError] = useState('')


    const [currentPos, setCurrentPos] = useState(null)
    const [selectedPos, setSelectedPos] = useState(null)
    const markerRef = useRef(null)
    const prevPosRef = useRef(null)

    useEffect(()=>{
        if (!navigator.geolocation) return setCurrentPos({ lat: 27.7172, lng: 85.3240 })
        navigator.geolocation.getCurrentPosition((pos)=>{
            setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        }, ()=>{
            setCurrentPos({ lat: 27.7172, lng: 85.3240 })
        })
    }, [])

    const handleMapClick = (latlng)=>{
        if (!currentPos){ setError('Current position unknown'); return }
        const d = distanceKm(currentPos.lat, currentPos.lng, latlng.lat, latlng.lng)
        if (d > MAX_RADIUS_KM){
            setError(`Selected point is ${d.toFixed(2)} km away — must be within ${MAX_RADIUS_KM} km`)
            return
        }
        prevPosRef.current = selectedPos || { lat: currentPos.lat, lng: currentPos.lng }
        setSelectedPos(latlng)
        setError('')
    }

    const handleMarkerDragEnd = (latlng)=>{
        if (!currentPos){ setError('Current position unknown'); return }
        const d = distanceKm(currentPos.lat, currentPos.lng, latlng.lat, latlng.lng)
        if (d > MAX_RADIUS_KM){
            setError(`Selected point is ${d.toFixed(2)} km away — must be within ${MAX_RADIUS_KM} km`)
            const prev = prevPosRef.current || { lat: currentPos.lat, lng: currentPos.lng }
            setSelectedPos(prev)
            try{ if (markerRef.current && markerRef.current.setLatLng) markerRef.current.setLatLng([prev.lat, prev.lng]) }catch(e){}
            return
        }
        prevPosRef.current = selectedPos || { lat: currentPos.lat, lng: currentPos.lng }
        setSelectedPos(latlng)
        setError('')
    }

    const handlePlaceOnlineOrder = async () => {

        if (!name || name.trim().length < 2){ setError('Please enter customer name'); return }
        if (!phone || phone.trim().length < 7){ setError('Please enter a valid contact number'); return }
        if (!selectedPos){ setError('Please pick a delivery location on the map within 5 km of your current location'); return }
        if (totalPrice < 1000){ setError('Online orders require minimum total Rs 1000'); return }

        setError('')
        // For now, just log the payload. Integration with backend/eSewa can be wired here.
        const payload = { customerName: name, phone, notes, deliveryLocation: selectedPos, products, totalPrice, shopId: state.shopId }
        try{
            const response = await api.post(`${BACKEND_URL}/orders/api/orders/create/`, {
                data: payload
            });

            console.log("response from order creation",response);



            console.log("Order created successfully:", response.data);
            const fields = response.data.fields;
            console.log("esewa fields:", fields);
            const pay_url = response.data.pay_url;
            const form = document.createElement("form");
        form.method = "POST";
        form.action = pay_url;

        Object.keys(fields).forEach(key => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = fields[key];
            form.appendChild(input);
        });

        document.body.appendChild(form);

        form.submit();
            alert('Order placed successfully!');
            navigate('/dashboard/customer/orders');
        }
        catch(err){
            console.error("Error creating order:", err);
            setError('Error placing order. Please try again.');
            return;

        }
        console.log('Online order payload:', payload)
        alert('Proceeding to online order (demo). Check console for payload.')
    }


    return (
        <div>
            {/* Modal backdrop */}
            <div className='backdrop-blur fixed top-0 left-0 w-full h-full flex justify-center items-center bg-opacity-40 z-40 overflow-auto'>
                <div className="bg-white p-6 rounded shadow-md w-[95vw] max-w-4xl">
                    <h2 className="text-lg font-semibold mb-3">Checkout</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Customer name</label>
                                <input className="w-full border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" />
                            </div>

                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Contact number</label>
                                <input className="w-full border rounded px-3 py-2" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. 98XXXXXXXX" />
                            </div>

                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                                <textarea className="w-full border rounded px-3 py-2" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} />
                            </div>

                            <div className="mb-3">
                                <h3 className="font-medium">Products</h3>
                                <div className="mt-2 space-y-2 max-h-40 overflow-auto">
                                    {products.map(p=> (
                                        <div key={p.id} className="flex items-center justify-between border px-3 py-2 rounded">
                                            <div>
                                                <div className="text-sm font-semibold">{p.name}</div>
                                                <div className="text-xs text-gray-500">Qty: {p.quantity || 1}</div>
                                            </div>
                                            <div className="text-sm">Rs {Number(p.price || 0) * Number(p.quantity || 1)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-2">
                                <div className="text-sm text-gray-600">Total: <span className="font-semibold">Rs {totalPrice.toFixed(0)}</span></div>
                                {totalPrice < 1000 ? (
                                    <div className="text-xs text-red-600 mt-1">Online orders require minimum total of Rs 1000. You can place an offline order.</div>
                                ) : (
                                    <div className="text-xs text-green-600 mt-1">Eligible for online payment</div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Delivery address (pick on map)</label>
                            <div className="border rounded overflow-hidden h-64">
                                {currentPos ? (
                                    <MapContainer center={[currentPos.lat, currentPos.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <Circle center={[currentPos.lat, currentPos.lng]} radius={MAX_RADIUS_KM * 1000} pathOptions={{ color: 'blue', fillOpacity: 0.05 }} />
                                        { !selectedPos && <Marker position={[currentPos.lat, currentPos.lng]} /> }
                                        <ClickHandler onClick={handleMapClick} />
                                        { (selectedPos || currentPos) && (
                                            <Marker
                                                position={[ (selectedPos || currentPos).lat, (selectedPos || currentPos).lng ]}
                                                draggable={true}
                                                eventHandlers={{
                                                    dragstart: ()=>{ prevPosRef.current = selectedPos || { lat: currentPos.lat, lng: currentPos.lng } },
                                                    dragend: (e)=>{ const latlng = e.target.getLatLng(); handleMarkerDragEnd({ lat: latlng.lat, lng: latlng.lng }) }
                                                }}
                                                ref={markerRef}
                                            />
                                        )}
                                    </MapContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full">Detecting location…</div>
                                )}
                                <div className="text-xs text-gray-500 p-2">Tap/click on the map to pick a delivery point within {MAX_RADIUS_KM} km of your current location. You can drag the marker to fine-tune.</div>
                            </div>
                        </div>
                    </div>

                    {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

                    <div className="flex justify-end space-x-2 mt-4">
                        <button type="button" className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" onClick={()=>navigate('/dashboard/customer/shops')}>Cancel</button>
                        <button type="button" disabled={totalPrice < 1000} className={`px-4 py-2 rounded text-white ${totalPrice < 1000 ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`} onClick={handlePlaceOnlineOrder}>Pay Online</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ManageCheckout;
