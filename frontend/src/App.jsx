import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import {BrowserRouter as Router, Route, Routes, Outlet} from 'react-router-dom'
import './App.css'
import RegisterPage from './pages/RegisterPage.jsx'
import RegisterAccountShopkeeper from './pages/RegisterAccountShopkeeper.jsx'
import Login from './pages/login/Login.jsx'
import RegisterAccountCustomer from './pages/RegisterAccountCustomer.jsx'
import MainDashboard from './pages/protectedpages/dashboard/shopkeeperdashboard/pages/MainDashboard.jsx'
import Sidebar from './pages/protectedpages/dashboard/shopkeeperdashboard/components/Sidebar.jsx'
import ManageProduct from './pages/protectedpages/dashboard/shopkeeperdashboard/pages/ManageProduct.jsx'
import Home from './pages/protectedpages/homepages/Home.jsx'
import ManageRequests from './pages/protectedpages/dashboard/shopkeeperdashboard/pages/ManageRequests.jsx'
import Shop from './pages/protectedpages/homepages/Shop.jsx'
import Orders from './pages/protectedpages/homepages/Orders.jsx'
import SidebarUser from './pages/protectedpages/dashboard/userdashboard/components/Sidebar.jsx'
import ManageConnectedShops from './pages/protectedpages/dashboard/userdashboard/pages/ManageConnectedShops.jsx'
import ProductBusiness from './pages/protectedpages/dashboard/userdashboard/pages/Shops/Product/ProductBusiness.jsx'
import ProductDetailPage from './pages/protectedpages/dashboard/userdashboard/pages/Shops/Product/ProductDetailPage.jsx'
import OrderPage from './pages/protectedpages/dashboard/userdashboard/pages/orders/OrderPage.jsx'
import ManageOrdersPage from './pages/protectedpages/dashboard/userdashboard/pages/Shops/orders/ManageOrdersPage.jsx'
import ManageCarts from './pages/protectedpages/dashboard/userdashboard/pages/carts/ManageCarts.jsx'
import DashboardPage from './pages/protectedpages/dashboard/userdashboard/pages/dashboard/DashboardPage.jsx'
import CustomerAnalyrics from './pages/protectedpages/dashboard/userdashboard/pages/analytics/CustomerAnalytics.jsx'
import ManageOrder from './pages/protectedpages/dashboard/shopkeeperdashboard/pages/ManageOrder.jsx'
import ManageCheckout from './pages/protectedpages/dashboard/userdashboard/pages/checkout/ManageCheckout.jsx'
import SettingPage from './pages/protectedpages/dashboard/userdashboard/pages/settings/SettingPage.jsx'
import ProfilePage from './pages/protectedpages/dashboard/userdashboard/pages/profile/ProfilePage.jsx'
import ReportPage from './pages/protectedpages/dashboard/shopkeeperdashboard/pages/report/ReportPage.jsx'
import CustomerPage from './pages/protectedpages/dashboard/shopkeeperdashboard/pages/customer/CustomerPage.jsx'
import About from './pages/protectedpages/aboutpage/About.jsx'
import Contact from './pages/protectedpages/contactpage/Contact.jsx'
import EsewaSuccess from './pages/protectedpages/dashboard/userdashboard/pages/orders/esewa-sucess/EsewaSuccess.jsx'
import EsewaFailure from './pages/protectedpages/dashboard/userdashboard/pages/orders/esewa-failure/EsewaFailure.jsx'
import ShopProductsPage from './pages/protectedpages/homepages/ShopProductsPage.jsx'
import ShopProductDetailPage from './pages/protectedpages/homepages/ShopProductDetailPage.jsx'
// const queryClient = new QueryClient()
function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/shops" element={<Shop />} />
        <Route path="/shops/:shopId/products" element={<ShopProductsPage />} />
        <Route path="/shops/:shopId/products/:productId" element={<ShopProductDetailPage />} />
        <Route path='/orders' element={<Orders/>}/>
        <Route path="/contact" element={<Contact/>}/>
        <Route path="/accounts/register/shopkeeper/" element={<RegisterAccountShopkeeper />} />
        <Route path="/accounts/register/user/" element={<RegisterAccountCustomer />} />
        <Route path ="/login" element={<Login />} />
        {/* Dashboard layout route with nested children */}
        <Route path="/dashboard/shopkeeper/" element={<Sidebar />}>
          <Route index element={<MainDashboard />} />
          <Route path="products" element={<ManageProduct />} />
          <Route path="requests" element={<ManageRequests />} />
          <Route path="orders" element={<ManageOrder/>}/>
          <Route path="reports" element={<ReportPage/>}/>
          <Route path="customers" element={<CustomerPage/>}/>
          
          {/* Add other dashboard child routes here, e.g. products, orders, etc. */}
        </Route>
        {/* route for customer dashboard */}
        <Route path="/dashboard/customer/" element={<SidebarUser />}>
          <Route index element={<DashboardPage />} />
          <Route path="shops" element={<ManageConnectedShops />} />
          <Route path="orders" element={<OrderPage />} />
          <Route path="requests" element={<ManageRequests />} />
          <Route path="shops/:shopId/products" element={<ProductBusiness />} />
          <Route path="shops/:shopId/products/:productId/detail" element={<ProductDetailPage />} />
          <Route path="shops/:shopId/orders" element={<ManageOrdersPage />} />
          <Route path="shops/:shopId/carts" element={<ManageCarts />} />
          <Route path="analytics" element={<CustomerAnalyrics />} />
          <Route path="orders/checkout" element={<ManageCheckout />} />
          <Route path="settings" element={<SettingPage/>}/>
          <Route path="profile" element={<ProfilePage/>}/>
          <Route path="orders/success" element= {<EsewaSuccess/>}/>
          <Route path="orders/failure" element={<EsewaFailure/>}/>
          
        </Route>
      </Routes>
    </Router>
  )
}

export default App
