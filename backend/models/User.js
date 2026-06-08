const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },

    role: {
      type: String,
      enum: ['admin', 'police', 'driver', 'owner'],
      required: true,
    },

    phone: { type: String, required: true },
    nid: { type: String, required: true, unique: true },

    badge: { type: String, unique: true, sparse: true },
    station: String,
    rank: String,

    status: {
      type: String,
      enum: ['active', 'suspended', 'blacklisted'],
      default: 'active',
    },

    profileImage: String,
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);