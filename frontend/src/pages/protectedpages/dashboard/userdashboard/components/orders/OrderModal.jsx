import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import api from '../../../../../../api/axios'

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

const OrderModal = ({ success, modalClose, product }) => {
    const { id, shopId, stocks = 0, price = 0 } = product || {}

    const [quantity, setQuantity] = useState(1)
    const [error, setError] = useState('')
    const [total, setTotal] = useState(Number(price) * 1)

    // location related
    const [currentPos, setCurrentPos] = useState(null)
    const [selectedPos, setSelectedPos] = useState(null)
        const markerRef = useRef(null)
        const prevPosRef = useRef(null)

    useEffect(()=>{
        setTotal(Number(price) * quantity)
    }, [price, quantity])

    useEffect(()=>{
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition((pos)=>{
            setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        }, (err)=>{
            // fallback to a default location (Kathmandu)
            setCurrentPos({ lat: 27.7172, lng: 85.3240 })
        })
    }, [])

    const handleQuantityChange = (e)=>{
        const v = Number(e.target.value)
        if (Number.isNaN(v)) return
        setQuantity(v)
        if (v < 1) setError('Quantity must be at least 1')
        else if (v > stocks) setError(`Only ${stocks} in stock`)
        else setError('')
    }

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
                // revert marker to previous position
                const prev = prevPosRef.current || { lat: currentPos.lat, lng: currentPos.lng }
                setSelectedPos(prev)
                // move marker programmatically if ref exists
                try{ if (markerRef.current && markerRef.current.setLatLng) markerRef.current.setLatLng([prev.lat, prev.lng]) }catch(e){}
                return
            }
            prevPosRef.current = selectedPos || { lat: currentPos.lat, lng: currentPos.lng }
            setSelectedPos(latlng)
            setError('')
        }

    const handleSuccessOrder = async ()=>{
        // validations
        if (quantity < 1){ setError('Quantity must be at least 1'); return }
        if (quantity > stocks){ setError(`Only ${stocks} in stock`); return }
        if (!selectedPos){ setError('Please pick a delivery location on the map within 5 km of your current location'); return }

        setError('')

        const payload = { productId: id, shopId, quantity, totalPrice: total, deliveryLocation: selectedPos }
        console.log("Order payload:", payload)

        // try{
        //     const res = await api.post('orders/api/orders/create/', payload)
        //     console.log("Order created, proceeding to payment:", res.data);

        // }
        // catch(err){

        // }

        try{
            const res = await api.post('orders/api/orders/create/', payload)
            const data = await res.data;
            console.log("Order created, proceeding to payment:", data);
            const payUrl = data.pay_url
            const fields = data.fields || {}

            // create a form and submit to eSewa
            const form = document.createElement('form')
            form.method = 'POST'
            form.action = payUrl
            Object.keys(fields).forEach(k=>{
                const inp = document.createElement('input')
                inp.type = 'hidden'
                inp.name = k
                inp.value = fields[k]
                form.appendChild(inp)
            })
            document.body.appendChild(form)
            form.submit()

        }catch(err){
            console.error(err)
            setError('Could not create order. Try again.')
        }
    }

    const handleClose = ()=>{
        modalClose && modalClose()
    }

    return (
        <div className='backdrop-blur fixed top-0 left-0 w-full h-full flex justify-center items-center bg-opacity-50'>
            <form onSubmit={(e)=>e.preventDefault()}>
                <div className="bg-white p-6 rounded shadow-md w-[95vw] max-w-3xl">
                    <h2 className="text-lg font-semibold mb-4">Place Your Order</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1" htmlFor="quantity">Quantity</label>
                                <input type="number" id="quantity" name="quantity" min="1" max={stocks} value={quantity} onChange={handleQuantityChange} className="w-full border border-gray-300 rounded px-3 py-2" />
                                <div className="text-xs text-gray-500 mt-1">In stock: {stocks}</div>
                            </div>

                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Total price</label>
                                <div className="text-lg font-semibold">₹{total.toLocaleString()}</div>
                            </div>

                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1" htmlFor="notes">Notes (optional)</label>
                                <textarea id="notes" name="notes" rows="3" className="w-full border border-gray-300 rounded px-3 py-2"></textarea>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Delivery location (pick on map)</label>
                            <div className="border rounded overflow-hidden h-64">
                                {currentPos ? (
                                                        <MapContainer center={[currentPos.lat, currentPos.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                            <Circle center={[currentPos.lat, currentPos.lng]} radius={MAX_RADIUS_KM * 1000} pathOptions={{ color: 'blue', fillOpacity: 0.05 }} />
                                                            {/* show the user's current location marker only when user hasn't placed/dragged the delivery marker */}
                                                            { !selectedPos && <Marker position={[currentPos.lat, currentPos.lng]} /> }
                                                            <ClickHandler onClick={handleMapClick} />
                                                            { (selectedPos || currentPos) && (
                                                                <Marker
                                                                    position={[ (selectedPos || currentPos).lat, (selectedPos || currentPos).lng ]}
                                                                    draggable={true}
                                                                    eventHandlers={{
                                                                        dragstart: ()=>{ prevPosRef.current = selectedPos || { lat: currentPos.lat, lng: currentPos.lng } },
                                                                        dragend: (e)=>{
                                                                            const latlng = e.target.getLatLng()
                                                                            handleMarkerDragEnd({ lat: latlng.lat, lng: latlng.lng })
                                                                        }
                                                                    }}
                                                                    ref={markerRef}
                                                                />
                                                            )}
                                                        </MapContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full">Detecting location…</div>
                                )}
                                <div className="text-xs text-gray-500 p-2">You can tap/click on the map to pick a delivery point within {MAX_RADIUS_KM} km of your current location.</div>
                            </div>
                        </div>
                    </div>

                    {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

                    <div className="flex justify-end space-x-2 mt-4">
                        <button type="button" className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" onClick={handleClose}>Cancel</button>
                        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleSuccessOrder}>Buy Now</button>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default OrderModal