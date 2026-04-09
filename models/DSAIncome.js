import mongoose from 'mongoose';

const dsaIncomeSchema = new mongoose.Schema({
  connectorId: {
    type: String,
    required: true,
    trim: true
  },
  loanId: {
    type: String,
    required: true,
    unique: true
  },
  applicantName: String,
  loanType: String,
  loanAmount: {
    type: Number,
    default: 0
  },
  income: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  },
  paymentDate: {
    type: Date
  },
  paymentMode: {
    type: String
  },
  paid: {
    type: Number,
    default: 0
  },
  unpaid: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

dsaIncomeSchema.index({ connectorId: 1, createdAt: -1 });

const DSAIncome = mongoose.model('DSAIncome', dsaIncomeSchema);
export default DSAIncome;

