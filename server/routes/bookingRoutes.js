const express = require('express');
const path = require('path');
const { getBookings, createBooking, updateBooking, deleteBooking } = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .get(protect, getBookings) // Protected - must be logged in to view bookings
    .post(protect, createBooking); // Must be logged in to create

// Setup multer for Excel import — restrict to .xlsx/.xls, max 5MB
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = /xlsx|xls/;
        if (allowed.test(path.extname(file.originalname).toLowerCase())) {
            cb(null, true);
        } else {
            cb(new Error('Excel files only (.xlsx, .xls)'));
        }
    }
});

router.route('/import')
    .post(protect, admin, upload.single('file'), require('../controllers/bookingController').importBookings)
    .delete(protect, admin, require('../controllers/bookingController').deleteImportedBookings);

router.route('/:id')
    .put(protect, updateBooking) // Must be logged in to update (student can cancel own, admin can approve)
    .delete(protect, admin, deleteBooking); // Admin only can delete

module.exports = router;

