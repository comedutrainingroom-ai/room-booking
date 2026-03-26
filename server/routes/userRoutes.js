const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    updateUserRole,
    toggleBanUser,
    deleteUser,
    contactUser
} = require('../controllers/userController');
const { protect, admin, adminUnlocked } = require('../middleware/authMiddleware');

// All routes require admin access
router.use(protect, admin, adminUnlocked);

router.route('/').get(getAllUsers);
router.route('/:id/contact').post(contactUser);
router.route('/:id/role').put(updateUserRole);
router.route('/:id/ban').put(toggleBanUser);
router.route('/:id').delete(deleteUser);

module.exports = router;
