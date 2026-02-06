const express = require('express');
const { getRooms, getRoom, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

const { upload, resizeImages } = require('../middleware/uploadMiddleware');

router.route('/')
    .get(getRooms) // Public - anyone can view rooms
    .post(protect, admin, upload.array('images', 5), resizeImages, createRoom); // Admin only

router.route('/:id')
    .get(getRoom) // Public - anyone can view single room
    .put(protect, admin, upload.array('images', 5), resizeImages, updateRoom) // Admin only
    .delete(protect, admin, deleteRoom); // Admin only

module.exports = router;

