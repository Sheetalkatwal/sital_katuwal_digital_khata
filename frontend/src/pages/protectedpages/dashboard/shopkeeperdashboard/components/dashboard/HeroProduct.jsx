import React from 'react'

const HeroProduct = () => {
    const heroProducts = [
        { name: 'Product A', description: 'Description for Product A', price: 29.99, quantitySold: 150 },
        { name: 'Product B', description: 'Description for Product B', price: 49.99, quantitySold: 80 },
        { name: 'Product C', description: 'Description for Product C', price: 19.99, quantitySold: 200 },
    ]
  return (
    <div>
        {/* make the products that are sold more */}
        {/* heading */}
        <h2 className="text-lg font-semibold mb-2 text-gray-900">Hero Products</h2>
        {heroProducts.map((product, index) => (
          <div key={index} className="bg-white rounded-xl shadow border border-gray-100 p-5">
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p>Price: Rs{product.price.toFixed(2)}</p>
            <p>Quantity Sold: {product.quantitySold}</p>

          </div>
        ))}
    </div>
  )
}

export default HeroProduct