import mongoose from "mongoose";
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["enquiry", "system", "alert"],
      default: "enquiry",
    },
    read: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String, // Link to redirect when clicked
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", NotificationSchema);
