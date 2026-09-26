// Componente de imagen con fallback robusto
import React from "react"
import { ImageWithFallbackProps, getImageFallbackProps } from "@shared/utils/image-utils"

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className,
  fallback = "PRODUCT",
  width,
  height,
  lazy = true,
  containerClassName,
  onClick,
  ...rest
}) => {
  const fallbackProps = getImageFallbackProps(src, alt, fallback, className)

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === "number" ? width + "px" : width
  if (height) style.height = typeof height === "number" ? height + "px" : height

  return (
    <div className={"image-container " + (containerClassName || "")} style={style}>
      <img
        {...fallbackProps}
        {...rest}
        loading={lazy ? "lazy" : "eager"}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? "button" : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick({} as React.MouseEvent<HTMLImageElement>); } } : undefined}
      />
    </div>
  )
}

export default ImageWithFallback



