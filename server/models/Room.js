const mongoose = require('mongoose');

const roomSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a room name'],
        unique: true,
        trim: true,
        maxlength: [50, 'Name can not be more than 50 characters']
    },
    capacity: {
        type: Number,
        required: [true, 'Please add capacity']
    },
    equipment: {
        type: [String],
        default: []
    },
    images: {
        type: [String],
        default: []
    },
    description: {
        type: String,
        maxlength: [500, 'Description can not be more than 500 characters']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Room', roomSchema);
