import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dmhnvhjqn",
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "924294523684577",
  api_secret: process.env.CLOUDINARY_API_SECRET || "p8JGNxeRy-FKwYqGuotgYbCzn4M",
});

export default cloudinary;
