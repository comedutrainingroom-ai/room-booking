const express = require('express');
const { getRooms, getRoom, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');
const { protect, admin, adminUnlocked } = require('../middleware/authMiddleware');

const router = express.Router();

const {
    uploadRoomImages,
    enforceRoomImageCount,
    resizeImages
} = require('../middleware/uploadMiddleware');

router.route('/')
    .get(getRooms) // Public - anyone can view rooms
    .post(protect, admin, adminUnlocked, uploadRoomImages, enforceRoomImageCount, resizeImages, createRoom); // Admin only

router.route('/:id')
    .get(getRoom) // Public - anyone can view single room
    .put(protect, admin, adminUnlocked, uploadRoomImages, enforceRoomImageCount, resizeImages, updateRoom) // Admin only
    .delete(protect, admin, adminUnlocked, deleteRoom); // Admin only

module.exports = router;

