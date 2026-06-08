type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

export const getImageDimensions = async (url: string) => {
  const image = await createImage(url);
  return { width: image.naturalWidth, height: image.naturalHeight };
};

export const isAspectRatioClose = (
  width: number,
  height: number,
  targetAspect: number,
  tolerance = 0.02
) => {
  if (!width || !height) return true;
  const ratio = width / height;
  return Math.abs(ratio - targetAspect) <= tolerance;
};

export const getCroppedImage = async (
  imageSrc: string,
  pixelCrop: CropArea,
  mimeType = "image/jpeg"
) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable.");
  }

  const cropX = Math.round(pixelCrop.x);
  const cropY = Math.round(pixelCrop.y);
  const cropWidth = Math.round(pixelCrop.width);
  const cropHeight = Math.round(pixelCrop.height);

  canvas.width = cropWidth;
  canvas.height = cropHeight;

  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return canvas.toDataURL(mimeType);
};
