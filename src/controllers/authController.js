



import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { sendEmail } from '../utils/sendEmail.js';


function generateOtp(length = 6) {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
}

export const register = async (req, res) => {
  const { email, password, isAdmin, name, role } = req.body;

  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const hashed = await hashPassword(password);
  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashed,
      role: role || 'EMPLOYEE',  // <-- Default role
      otp,
      otpExpiresAt,
      isVerified: false,
    },
  });

  console.log(`🔐 OTP for ${email}: ${otp}`);

  await sendEmail(
    email,
    'Verify your account - OTP',
    `Your OTP for registration is ${otp}. It expires in 10 minutes.`
  );

  res.status(201).json({ message: 'User registered. Please verify OTP sent to your email.' });
};
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.otp || !user.otpExpiresAt) {
    return res.status(400).json({ message: 'Invalid request or already verified' });
  }

  if (user.otp !== otp) {
    return res.status(400).json({ message: 'Incorrect OTP' });
  }

  if (new Date() > user.otpExpiresAt) {
    return res.status(400).json({ message: 'OTP expired' });
  }

  await prisma.user.update({
    where: { email },
    data: {
      isVerified: true,
      otp: null,
      otpExpiresAt: null,
    },
  });

  res.status(200).json({ message: 'OTP verified successfully. You can now log in.' });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(400).json({ message: 'Email not found. Please sign up first.' });
  }

  if (!user.isVerified) {
    return res.status(400).json({ message: 'Please verify your account using OTP.' });
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, isAdmin: user.isAdmin, emailId: email, name: user.name,role: user.role    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(200).json({
    message: 'Logged in successfully',
    user: {
      email: user.email,
      isAdmin: user.isAdmin,
      name: user.name,
      role: user.role   
    },
    token,
  });
};

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!user.isVerified) {
    return res.status(400).json({ message: 'User is not verified.' });
  }

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.user.update({
    where: { email },
    data: { otp, otpExpiresAt },
  });

  console.log(`🔁 Password Reset OTP for ${email}: ${otp}`); // Replace with email/SMS
await sendEmail(
  email,
  'Password Reset OTP',
  `Your OTP to reset your password is ${otp}. It expires in 10 minutes.`
);


  res.status(200).json({ message: 'OTP sent for password reset. Please check your email.' });
};



export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.otp || !user.otpExpiresAt) {
    return res.status(400).json({ message: 'Invalid request or OTP not found.' });
  }

  if (user.otp !== otp) {
    return res.status(400).json({ message: 'Incorrect OTP' });
  }

  if (new Date() > user.otpExpiresAt) {
    return res.status(400).json({ message: 'OTP expired' });
  }

  const hashed = await hashPassword(newPassword);

  await prisma.user.update({
    where: { email },
    data: {
      password: hashed,
      otp: null,
      otpExpiresAt: null,
    },
  });

  res.status(200).json({ message: 'Password reset successful. You can now log in.' });
};

export const resendOtp = async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.isVerified) {
    return res.status(400).json({ message: 'User is already verified.' });
  }

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // valid for 10 mins

  await prisma.user.update({
    where: { email },
    data: {
      otp,
      otpExpiresAt,
    },
  });

console.log(`📨 Resent OTP for ${email}: ${otp}`); // Replace with email/SMS sending logic
await sendEmail(
  email,
  'Your OTP has been resent',
  `Your new OTP is ${otp}. It expires in 10 minutes.`
);

  res.status(200).json({ message: 'OTP resent successfully. Please check your email.' });
};



export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });

  res.status(200).json({ message: 'Logged out successfully' });
};
