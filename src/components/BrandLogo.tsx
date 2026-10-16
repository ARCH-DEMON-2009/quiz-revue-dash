import { useState } from "react";

interface BrandLogoProps {
  alt: string;
  className?: string;
}

const BrandLogo = ({ alt, className }: BrandLogoProps) => {
  const [src, setSrc] = useState("/logo-winter.svg");

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setSrc("/logo.png")}
    />
  );
};

export default BrandLogo;