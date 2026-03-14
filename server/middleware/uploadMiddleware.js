const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per image
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images Only!');
        }
    }
});

const resizeImages = async (req, res, next) => {
    if (!req.files) return next();

    req.body.images = [];

    await Promise.all(
        req.files.map(async (file) => {
            const filename = `room-${Date.now()}-${file.originalname.split('.')[0]}.webp`;

            await sharp(file.buffer)
                .resize(800, 600, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toFormat('webp')
                .webp({ quality: 80 })
                .toFile(path.join(uploadDir, filename));

            req.body.images.push(filename);
        })
    );

    next();
};

module.exports = { upload, resizeImages };
