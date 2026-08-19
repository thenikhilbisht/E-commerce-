import { useState } from "react";

export default function ProductImage({
  src,
  secondarySrc,
  alt = "Product Image",
  aspectRatio = "4/5",
  className = "",
  style = {},
  fit = "cover"
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Fallback image if main src fails
  const defaultFallback = "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80";

  return (
    <div
      className={`product-img-wrapper ${className}`}
      style={{
        position: "relative",
        aspectRatio: aspectRatio,
        overflow: "hidden",
        backgroundColor: "#f1f5f9",
        borderRadius: "inherit",
        ...style
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Skeleton background while loading */}
      {!loaded && !error && (
        <div
          className="skeleton-shimmer"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1
          }}
        />
      )}

      {/* Main Image */}
      <img
        src={error ? defaultFallback : (src || defaultFallback)}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: fit,
          objectPosition: "top center",
          display: "block",
          transition: "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease",
          opacity: loaded ? (secondarySrc && isHovered ? 0 : 1) : 0,
          transform: isHovered && !secondarySrc ? "scale(1.06)" : "scale(1.0)"
        }}
      />

      {/* Secondary Hover Image (if present) */}
      {secondarySrc && (
        <img
          src={secondarySrc}
          alt={`${alt} hover`}
          loading="lazy"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: fit,
            objectPosition: "top center",
            display: "block",
            transition: "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease",
            opacity: loaded && isHovered ? 1 : 0,
            transform: isHovered ? "scale(1.06)" : "scale(1.0)",
            zIndex: 2
          }}
        />
      )}
    </div>
  );
}
