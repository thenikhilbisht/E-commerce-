import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ProductImage from "./ProductImage";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function QuickViewModal({ product, isOpen, onClose }) {
  const { addItem } = useCart();
  const toast = useToast();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError, setSizeError] = useState(false);

  useEffect(() => {
    setSelectedImage(0);
    setSelectedSize("");
    setSizeError(false);
  }, [product]);

  if (!isOpen || !product) return null;

  const images = product.images && product.images.length > 0
    ? product.images
    : ["https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80"];

  const discountPct = product.compare_price && product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : null;

  const handleAddToCart = () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      setSizeError(true);
      return;
    }
    addItem(product, selectedSize || null);
    toast.success("Added to cart!");
    onClose();
  };

  return (
    <div className="quickview-overlay" onClick={onClose}>
      <div
        className="quickview-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view ${product.title}`}
      >
        <button className="quickview-modal__close" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        <div className="quickview-grid">
          {/* Gallery */}
          <div className="quickview-gallery">
            <div className="quickview-gallery__main">
              <ProductImage
                src={images[selectedImage]}
                alt={product.title}
                aspectRatio="4/5"
              />
            </div>
            {images.length > 1 && (
              <div className="quickview-gallery__thumbs">
                {images.map((img, i) => (
                  <button
                    key={i}
                    className={`quickview-gallery__thumb ${selectedImage === i ? "active" : ""}`}
                    onClick={() => setSelectedImage(i)}
                  >
                    <img src={img} alt={`${product.title} thumbnail ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="quickview-info">
            {product.category_name && (
              <span className="quickview-info__category">{product.category_name}</span>
            )}
            <h2 className="quickview-info__title">{product.title}</h2>

            <div className="quickview-info__prices">
              <span className="quickview-info__price">₹{product.price.toLocaleString("en-IN")}</span>
              {product.compare_price && (
                <span className="quickview-info__compare">₹{product.compare_price.toLocaleString("en-IN")}</span>
              )}
              {discountPct && (
                <span className="quickview-info__discount">{discountPct}% OFF</span>
              )}
            </div>

            {/* Sizes */}
            {product.sizes?.length > 0 && (
              <div className="quickview-info__sizes">
                <label className="quickview-info__label">
                  Select Size {selectedSize && <span>— {selectedSize}</span>}
                </label>
                <div className="size-grid">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      className={`size-option ${selectedSize === size ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedSize(size);
                        setSizeError(false);
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {sizeError && <p className="form-error">⚠ Please select a size</p>}
              </div>
            )}

            {/* Description Snippet */}
            {product.description && (
              <div
                className="quickview-info__desc"
                dangerouslySetInnerHTML={{
                  __html: product.description.length > 250
                    ? product.description.slice(0, 250) + "..."
                    : product.description
                }}
              />
            )}

            {/* CTAs */}
            <div className="quickview-info__actions">
              <button className="btn btn-primary btn-lg btn-full" onClick={handleAddToCart}>
                🛒 Add to Cart
              </button>
              <Link
                to={`/product/${product.id}`}
                className="btn btn-ghost btn-full"
                onClick={onClose}
                style={{ textAlign: "center" }}
              >
                View Full Product Details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
