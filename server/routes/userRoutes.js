const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    updateUserRole,
    toggleBanUser,
    deleteUser
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes require admin access
router.use(protect, admin);

router.route('/').get(getAllUsers);
router.route('/:id/role').put(updateUserRole);
router.route('/:id/ban').put(toggleBanUser);
router.route('/:id').delete(deleteUser);

module.exports = router;
