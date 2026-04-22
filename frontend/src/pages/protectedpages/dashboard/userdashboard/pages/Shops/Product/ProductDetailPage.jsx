import React from 'react'
import { useParams } from 'react-router-dom';
import ProductDetail from '../../../components/manageshops/ProductDetail';

const ProductDetailPage = () => {
  const { productId,shopId } = useParams();


  console.log("this is shopid",shopId)
  console.log("this is Product Id",productId)


  return (
    <div>
      <h1>Product Detail for ID: {productId}</h1>

      <ProductDetail productId={productId}
      shopId={shopId}/>
    </div>
  )
}

export default ProductDetailPage