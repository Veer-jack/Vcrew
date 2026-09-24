import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Local disk storage got wiped on every deploy (no persistent volume), so a
// file uploaded before the next deploy 404'd forever even though whatever
// referenced it (a chat message, a submitted proof, a resume) lived on in
// Postgres. Cloudinary's URLs are permanent regardless of what happens to
// this app's own filesystem — every upload spot in the app shares this one
// configured client/storage factory instead of each keeping its own
// diskStorage config.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

// One storage engine per Cloudinary folder -- callers still set their own
// multer `limits`/`fileFilter` (a resume caps at 5MB and PDF-only, task
// proof allows video up to 50MB, etc.), only the "where/how it's stored"
// part is shared.
export const makeCloudinaryStorage = (folder) => new CloudinaryStorage({
  cloudinary,
  params: { folder, resource_type: "auto" },
});

const storage = makeCloudinaryStorage("vcrew-attachments");

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "text/plain", "text/csv", "application/zip",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("File type not allowed"));
  },
});
