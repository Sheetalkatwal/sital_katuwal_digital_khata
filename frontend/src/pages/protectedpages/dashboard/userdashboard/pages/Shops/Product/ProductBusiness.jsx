import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ProductList from '../../../components/manageshops/ProductList';

const ProductBusiness = () => {

    const {shopId} = useParams();
    const [shopDetails, setShopDetails] = useState(null);

    // console.log("Shop ID:", shopId);
    // getting shop details

    const shopDetail = ()=>{
        // Fetch shop details using shopId

        setShopDetails({id: shopId, name: "Demo Shop"});
        
    }

    useEffect(()=>{
        shopDetail();
    },[])

  return (
    <div>
      {/* <h2>Product Business for {shopDetails?.name}</h2> */}
      {/* Render other shop details and products here */}
      <ProductList/>
    </div>
  )
}

export default ProductBusiness