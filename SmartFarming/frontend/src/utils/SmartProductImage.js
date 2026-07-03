/**
 * SmartProductImage Component
 * Renders a product image that automatically fetches the correct image
 * from Wikipedia based on the product name.
 * 
 * Shows category placeholder first, then swaps to the real image
 * once Wikipedia returns it (cached for future renders).
 * 
 * Detects tiny placeholder images (1x1 pixel) at runtime and
 * replaces them with Wikipedia images automatically.
 */
import React, { useState, useEffect, useRef } from 'react';
import { getProductImage, PLACEHOLDER_IMG } from './productImages';

const SmartProductImage = ({ product, alt, style, className }) => {
  const [imgSrc, setImgSrc] = useState(PLACEHOLDER_IMG);
  const [useWikipedia, setUseWikipedia] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setUseWikipedia(false);

    // Get initial image (may be cached or category fallback)
    const initialSrc = getProductImage(product, (newUrl) => {
      // This callback fires when Wikipedia returns the real image
      if (mountedRef.current) {
        setImgSrc(newUrl);
      }
    });
    setImgSrc(initialSrc);

    return () => {
      mountedRef.current = false;
    };
  // Only re-run when product name changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.name, product?.id, product?.image_url]);

  /**
   * When the image loads, check if it's a tiny placeholder (1x1 or 2x2 pixel).
   * If so, force a Wikipedia image fetch instead.
   */
  const handleLoad = (e) => {
    const img = e.target;
    if (
      img.naturalWidth <= 2 &&
      img.naturalHeight <= 2 &&
      !useWikipedia &&
      imgSrc.includes('cloudinary.com')
    ) {
      // This is a placeholder image — force Wikipedia fetch
      setUseWikipedia(true);
      const wikiSrc = getProductImage(
        { ...product, image_url: null, image: null, images: null },
        (newUrl) => {
          if (mountedRef.current) {
            setImgSrc(newUrl);
          }
        }
      );
      setImgSrc(wikiSrc);
    }
  };

  const handleError = () => {
    setImgSrc(PLACEHOLDER_IMG);
  };

  return (
    <img
      src={imgSrc}
      alt={alt || product?.name || 'Product'}
      onLoad={handleLoad}
      onError={handleError}
      style={style}
      className={className}
      loading="lazy"
    />
  );
};

export default SmartProductImage;
