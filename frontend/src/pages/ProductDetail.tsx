import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { getMediaUrl } from "../lib/api";
import { useCartStore } from "../store/cartStore";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../lib/money";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image?: string;
  seller?: {
    _id: string;
    name: string;
  };
}

function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const addToCart = useCartStore((state) => state.addToCart);

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get("/api/products");
        const found = res.data.find((p: Product) => p._id === id);

        if (!found) {
          setError("Product not found");
        } else {
          setProduct(found);
        }
      } catch {
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const totalPrice = product ? (product.price * quantity).toFixed(2) : "0.00";

  const handleAddToCart = () => {
    if (!product) return;

    addToCart({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      stock: product.stock,
    });

    alert(`${quantity} × ${product.name} added to cart!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-500 text-lg">{error || "Product not found"}</p>
        <button
          onClick={() => navigate("/marketplace")}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate("/marketplace")}
          className="text-blue-600 hover:underline mb-6 inline-block"
        >
          ← Back to Shop
        </button>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Product Image */}
            <div className="bg-gray-100 rounded-lg h-80 flex items-center justify-center overflow-hidden">
              {product.image ? (
                <img
                  src={getMediaUrl(product.image)}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-gray-400">No Image Available</div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-gray-800">{product.name}</h1>

              {product.seller && (
                <p className="text-sm text-gray-500 mt-2">
                  Sold by:{" "}
                  <span className="font-medium">{product.seller.name}</span>
                </p>
              )}

              <p className="text-gray-600 mt-4 leading-relaxed">
                {product.description}
              </p>

              <div className="mt-6">
                <span className="text-3xl font-bold text-blue-600">
                  {formatMoney(product.price)}
                </span>
                <span className="text-gray-500 ml-3">
                  {product.stock > 0
                    ? `${product.stock} in stock`
                    : "Out of stock"}
                </span>
              </div>

              {/* Quantity Selector */}
              <div className="mt-8">
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-lg border flex items-center justify-center hover:bg-gray-100"
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => {
                      const value = Math.max(
                        1,
                        Math.min(product.stock, Number(e.target.value) || 1)
                      );
                      setQuantity(value);
                    }}
                    className="w-16 text-center border rounded-lg py-2"
                  />
                  <button
                    onClick={() =>
                      setQuantity((prev) => Math.min(product.stock, prev + 1))
                    }
                    className="w-10 h-10 rounded-lg border flex items-center justify-center hover:bg-gray-100"
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-gray-800">
                    {formatMoney(Number(totalPrice))}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                </button>

                {user && product.seller && user.id !== product.seller._id && (
                  <Link
                    to={`/messages?user=${product.seller._id}&name=${encodeURIComponent(
                      product.seller.name
                    )}`}
                    className="flex-1 text-center border border-blue-600 text-blue-600 py-3 rounded-lg hover:bg-blue-50 transition"
                  >
                    Message Seller
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
