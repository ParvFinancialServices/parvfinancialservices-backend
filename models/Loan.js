import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
  id_of_connector: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Disbursed', 'Rejected'],
    default: 'Pending'
  },
  loanAmount: {
    type: Number,
    default: 0
  },
  // Add other loan fields as needed
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Loan = mongoose.model('Loan', loanSchema);
export default Loan;

