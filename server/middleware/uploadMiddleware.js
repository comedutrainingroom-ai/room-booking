const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOM_IMAGE_MAX_FILES = 8;
const ROOM_IMAGE_MAX_FILE_SIZE_MB = 20;
const ROOM_IMAGE_MAX_FILE_SIZE_BYTES = ROOM_IMAGE_MAX_FILE_SIZE_MB * 1024 * 1024;
const ROOM_IMAGE_MAX_TOTAL_UPLOAD_MB = 100;
const ROOM_IMAGE_MAX_TOTAL_UPLOAD_BYTES = ROOM_IMAGE_MAX_TOTAL_UPLOAD_MB * 1024 * 1024;

// Ensure uploads directory exists
// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: ROOM_IMAGE_MAX_FILE_SIZE_BYTES },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPEG, JPG, PNG, and WEBP images are allowed'));
        }
    }
});

const normalizeKeepImages = (value) => {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
        return [value];
    }

    return [];
};

const getUploadedRoomImageTotalBytes = (files = []) => files.reduce(
    (total, file) => total + (file?.size || 0),
    0
);

const handleRoomImageUploadError = (error, res) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: `Each room image must be ${ROOM_IMAGE_MAX_FILE_SIZE_MB}MB or smaller`,
            code: 'ROOM_IMAGE_FILE_TOO_LARGE'
        });
    }

    if (error?.code === 'LIMIT_FILE_COUNT' || error?.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            error: `Each room can have up to ${ROOM_IMAGE_MAX_FILES} images`,
            code: 'ROOM_IMAGE_LIMIT'
        });
    }

    if (error?.code === 'ROOM_IMAGE_TOTAL_TOO_LARGE') {
        return res.status(400).json({
            success: false,
            error: `Total room image upload must be ${ROOM_IMAGE_MAX_TOTAL_UPLOAD_MB}MB or smaller`,
            code: 'ROOM_IMAGE_TOTAL_TOO_LARGE'
        });
    }

    return res.status(400).json({
        success: false,
        error: error?.message || 'Image upload failed',
        code: 'ROOM_IMAGE_UPLOAD_ERROR'
    });
};

const uploadRoomImages = (req, res, next) => {
    upload.array('images', ROOM_IMAGE_MAX_FILES)(req, res, (error) => {
        if (error) {
            return handleRoomImageUploadError(error, res);
        }

        const totalUploadBytes = getUploadedRoomImageTotalBytes(req.files);
        if (totalUploadBytes > ROOM_IMAGE_MAX_TOTAL_UPLOAD_BYTES) {
            return handleRoomImageUploadError({ code: 'ROOM_IMAGE_TOTAL_TOO_LARGE' }, res);
        }

        return next();
    });
};

const enforceRoomImageCount = (req, res, next) => {
    const keepImages = normalizeKeepImages(req.body.keepImages);
    const uploadedImageCount = Array.isArray(req.files) ? req.files.length : 0;
    const totalImageCount = keepImages.length + uploadedImageCount;

    if (totalImageCount > ROOM_IMAGE_MAX_FILES) {
        return res.status(400).json({
            success: false,
            error: `Each room can have up to ${ROOM_IMAGE_MAX_FILES} images`,
            code: 'ROOM_IMAGE_LIMIT'
        });
    }

    return next();
};

const resizeImages = async (req, res, next) => {
    if (!Array.isArray(req.files) || req.files.length === 0) return next();

    req.body.images = [];

    try {
        for (const [index, file] of req.files.entries()) {
            const fileBaseName = path.parse(file.originalname).name
                .replace(/[^a-zA-Z0-9-_]/g, '-')
                .slice(0, 40) || 'image';
            const filename = `room-${Date.now()}-${index}-${fileBaseName}.webp`;

            await sharp(file.buffer)
                .resize(800, 600, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toFormat('webp')
                .webp({ quality: 80 })
                .toFile(path.join(uploadDir, filename));

            req.body.images.push(filename);
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    ROOM_IMAGE_MAX_FILES,
    ROOM_IMAGE_MAX_FILE_SIZE_MB,
    ROOM_IMAGE_MAX_TOTAL_UPLOAD_MB,
    ROOM_IMAGE_MAX_TOTAL_UPLOAD_BYTES,
    uploadRoomImages,
    enforceRoomImageCount,
    resizeImages
};
