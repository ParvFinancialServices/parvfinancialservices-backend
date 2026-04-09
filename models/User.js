import mongoose from 'mongoose';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  salt: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['DSA', 'Admin', 'RM', "Field_staff", "Telecaller"],
    default: 'DSA'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'inactive'],
    default: 'pending'
  },
  // Personal Information
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  phone_no: {
    type: String,
    required: true,
    trim: true
  },
  alt_phone_no: {
    type: String,
    trim: true
  },
  dob: {
    type: String
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  marital_status: {
    type: String
  },
  guardian_name: {
    type: String,
    trim: true
  },
  // Address Information
  present_address: {
    type: String,
    trim: true
  },
  permanent_address: {
    type: String,
    trim: true
  },
  work_location: {
    type: String,
    trim: true
  },
  // Document URLs
  photo: {
    type: String
  },
  aadhar: {
    type: String
  },
  aadhar_no: {
    type: String,
    trim: true
  },
  pan: {
    type: String
  },
  pan_no: {
    type: String,
    trim: true
  },
  bank_doc: {
    type: String
  },
  bank_account_no: {
    type: String,
    trim: true
  },
  bank_branch: {
    type: String,
    trim: true
  },
  // Dates
  date: {
    type: Date,
    default: Date.now
  },
  date_of_joining: {
    type: String,
    default: ''
  },
  approvedAt: {
    type: Date
  },
  reviewRemarks: {
    type: String,
    trim: true,
    default: ""
  }
}, {
  timestamps: true
});

// Method to verify password
userSchema.methods.verifyPassword = function (password) {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 10, 16, 'sha512')
    .toString('hex');
  return this.password === hash;
};

// Method to generate password hash
userSchema.statics.generatePassword = function (password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, 10, 16, 'sha512')
    .toString('hex');
};

const User = mongoose.model('User', userSchema);
export default User;

