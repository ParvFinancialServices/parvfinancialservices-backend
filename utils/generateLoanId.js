import Counter from "../models/Counter.js";

export const generateLoanId = async (loanType, Model) => {
    // Expected types: 'Business', 'Gold', 'Personal', 'Vehicle', 'Home', 'Group'
    const prefixes = {
        'Business': 'BL',
        'Gold': 'GL',
        'Personal': 'PL',
        'Vehicle': 'VL',
        'Home': 'HL',
        'Group': 'GRL'
    };

    const typeKey = loanType || 'Unknown';
    const prefix = prefixes[typeKey] || 'LN';

    // Atomic increment using findOneAndUpdate
    const counter = await Counter.findOneAndUpdate(
        { name: typeKey },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
    );

    const nextNumber = counter.sequence;

    // Pad with zeros to make it 4 digits (e.g., 0001, 0012, 0123)
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}${formattedNumber}`;
};
