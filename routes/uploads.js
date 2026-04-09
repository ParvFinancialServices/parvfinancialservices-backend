import express from "express";
import { removeImage, uploadImage } from "../controllers/uploadControllers.js";
const router = express.Router();

router.post("/upload-image", uploadImage);
router.post("/remove-image", removeImage);

export default router;
