const Room = require('../models/Room');
const fs = require('fs');
const path = require('path');

// Helper function to delete images from filesystem
const deleteRoomImages = (images) => {
    if (images && images.length > 0) {
        images.forEach(image => {
            const filePath = path.join(__dirname, '../uploads', image);
            fs.unlink(filePath, (err) => {
                // Ignore error if file doesn't exist, log otherwise
                if (err && err.code !== 'ENOENT') console.error(`Failed to delete file: ${filePath}`, err);
            });
        });
    }
};

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public
const getRooms = async (req, res) => {
    try {
        const rooms = await Room.find();
        res.status(200).json({
            success: true,
            count: rooms.length,
            data: rooms
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Create a room
// @route   POST /api/rooms
// @access  Public (should be private in real app)
const createRoom = async (req, res) => {
    try {
        // Explicit field selection — prevents mass assignment
        const { name, capacity, type, description, amenities, location, floor, isActive } = req.body;
        
        const room = await Room.create({
            name,
            capacity,
            type,
            description,
            amenities,
            location,
            floor,
            isActive: isActive !== undefined ? isActive : true,
            images: req.body.images || [] // Prepared by middleware
        });

        res.status(201).json({
            success: true,
            data: room
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'ชื่อห้องนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }
        console.error('Create Room Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Public
const getRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        res.status(200).json({ success: true, data: room });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Public
const updateRoom = async (req, res) => {
    try {
        let room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        // Helper to ensure array
        let keepImages = req.body.keepImages || [];
        if (typeof keepImages === 'string') {
            keepImages = [keepImages];
        }

        // Identify images to delete (images currently in DB that are NOT in keepImages)
        // If keepImages is empty, it means user removed all OLD images (or didn't send any)
        const imagesToDelete = room.images.filter(img => !keepImages.includes(img));

        // Delete removed images from filesystem
        deleteRoomImages(imagesToDelete);

        // Combine kept images with NEWLY uploaded images (req.body.images populated by middleware)
        const newImages = req.body.images || [];
        req.body.images = [...keepImages, ...newImages];

        // Update with explicit field selection
        const { name, capacity, type, description, amenities, location, floor, isActive } = req.body;
        
        room = await Room.findByIdAndUpdate(req.params.id, {
            name,
            capacity,
            type,
            description,
            amenities,
            location,
            floor,
            isActive: isActive !== undefined ? isActive : room.isActive,
            images: req.body.images // Prepared above as [...keepImages, ...newImages]
        }, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: room });
    } catch (error) {
        console.error('Update Room Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Public
const deleteRoom = async (req, res) => {
    try {
        const room = await Room.findByIdAndDelete(req.params.id);

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        // Delete associated images
        deleteRoomImages(room.images);

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
    getRooms,
    getRoom,
    createRoom,
    updateRoom,
    deleteRoom
};
