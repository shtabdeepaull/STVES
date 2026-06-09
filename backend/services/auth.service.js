const bcrypt = require("bcryptjs");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const generateToken = require("../utils/generateToken");

const ALLOWED_ROLES = ["admin", "police", "driver", "owner"];

const sanitizeUser = (user) => {
  if (!user) return null;

  const obj = user.toObject ? user.toObject() : user;

  delete obj.password;

  return {
    id: obj._id,
    _id: obj._id,
    name: obj.name,
    email: obj.email,
    role: obj.role,
    status: obj.status,
    phone: obj.phone || "",
    nid: obj.nid || "",
    badge: obj.badge || "",
    station: obj.station || "",
    rank: obj.rank || "",
    lastLogin: obj.lastLogin || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const registerUser = async (payload) => {
  const {
    name,
    email,
    password,
    role = "driver",
    phone,
    nid,
    badge,
    station,
    rank,
  } = payload;

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required.", 400);
  }

  if (!ALLOWED_ROLES.includes(role)) {
    throw new AppError("Invalid user role.", 400);
  }

  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters.", 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("User already exists with this email.", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const userData = {
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role,
    status: "active",
  };

  if (phone) userData.phone = phone;
  if (nid) userData.nid = nid;

  // Important: police-only fields only police user er jonno set korbo
  // Empty string set korbo na, otherwise sparse unique index conflict korte pare
  if (role === "police") {
    if (badge) userData.badge = badge;
    if (station) userData.station = station;
    if (rank) userData.rank = rank;
  }

  const user = await User.create(userData);

  const token = generateToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
};

const loginUser = async (payload) => {
  const { email, password } = payload;

  if (!email || !password) {
    throw new AppError("Email and password are required.", 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (user.status !== "active") {
    throw new AppError(`Account is ${user.status}. Please contact admin.`, 403);
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        lastLogin: new Date(),
      },
    }
  );

  const freshUser = await User.findById(user._id);
  const token = generateToken(freshUser);

  return {
    token,
    user: sanitizeUser(freshUser),
  };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return sanitizeUser(user);
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};