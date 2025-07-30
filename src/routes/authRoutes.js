
import express from 'express';
import { register, login, verifyOtp, logout, resendOtp, resetPassword, requestPasswordReset } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/verify-otp', verifyOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/resend-otp', resendOtp);
router.post('/request-reset', requestPasswordReset);
router.post('/reset-password', resetPassword); 
router.post('/me', protect, (req, res) => {
  res.status(200).json(req.user); 
});


export default router;
