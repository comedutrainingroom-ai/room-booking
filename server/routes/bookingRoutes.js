const express = require('express');
const { getBookings, createBooking, updateBooking, deleteBooking } = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .get(getBookings) // Public - anyone can view bookings
    .post(protect, createBooking); // Must be logged in to create

// Setup multer for memory storage (buffer access)
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.route('/import')
    .post(protect, admin, upload.single('file'), require('../controllers/bookingController').importBookings)
    .delete(protect, admin, require('../controllers/bookingController').deleteImportedBookings);

router.route('/:id')
    .put(protect, updateBooking) // Must be logged in to update (student can cancel own, admin can approve)
    .delete(protect, admin, deleteBooking); // Admin only can delete

module.exports = router;

