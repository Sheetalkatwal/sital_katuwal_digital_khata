import React from 'react'
import { Outlet } from 'react-router-dom'

const Sidebar = ({children}) => {

    const sideLinkNavbar = [
        {
            name:"Dashboard",
            link:"/dashboard/customer"
        },
        {
            name:"Shops",
            link:"/dashboard/customer/shops"
        },{
            name:"Payment account",
            link:"/dashboard/customer/payment-account"
        },
        {
            name:"Analytics",
            link:"/dashboard/customer/analytics"
        },
        {
            name:"Settings",
            link:"/dashboard/customer/settings"
        },
        {
            name:"Profile",
            link:"/dashboard/customer/profile"
        }
    ]
  return (
    <div>
        <div className="flex min-h-screen">
            {/* left side */}
            <div className="w-64 h-screen bg-white text-black flex flex-col  sticky top-0">
                <div className="p-6 text-2xl font-bold border-b border-gray-700">
                    Customer Dashboard
                </div>
                <nav className="flex-1 p-4">
                    <ul className="space-y-4">
                        {sideLinkNavbar.map((item)=>(
                            <li key={item.name}>
                                <a href={item.link} className="block px-4 py-2 rounded hover:bg-blue-200 transition">
                                    {item.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
            {/* right side */}
            <div className="flex-1 px-4 py-6 bg-gray-100">
                    <Outlet />
            </div>
        </div>


        
    </div>
  )
}

export default Sidebar