import cloudinary from "../config/cloudaniry.js";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

export const uploadImage = [
  upload.single("image"),
  async (req, res) => {
    try {
      const folder = req.body.folder || "general";

      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file provided" });
      }

      const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

      const result = await cloudinary.uploader.upload(fileBase64, {
        folder,
        resource_type: "auto",
      });

      res.status(200).json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({
        success: false,
        message: "Upload failed",
        error: error.message,
      });
    }
  }
];

export const removeImage = async (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        message: "public_id is required",
      });
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: "image",
    });

    if (result?.result !== "ok" && result?.result !== "not found") {
      return res.status(400).json({
        success: false,
        message: "Unable to remove image",
        result: result?.result,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document removed successfully",
    });
  } catch (error) {
    console.error("Image remove error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove image",
      error: error.message,
    });
  }
};
