import JobApplication from '../models/JobApplication.js';

// Create a new job application
export const createJobApplication = async (req, res) => {
  try {
    const { fullName, email, phone, state, city, position, experience, message, resumeUrl } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !state || !city || !position || experience === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Create new application
    const application = await JobApplication.create({
      fullName,
      email,
      phone,
      state,
      city,
      position,
      experience,
      message,
      resumeUrl
    });

    res.status(201).json({
      success: true,
      message: 'Job application submitted successfully',
      data: application
    });
  } catch (error) {
    console.error('Create job application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit job application',
      error: error.message
    });
  }
};

// Get all job applications with pagination and filters
export const getJobApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      status,
      position,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { isDeleted: false };
    
    if (status) filter.status = status;
    if (position) filter.position = position;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch data
    const [applications, totalCount] = await Promise.all([
      JobApplication.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      JobApplication.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        totalCount
      }
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job applications',
      error: error.message
    });
  }
};

// Get single job application by ID
export const getJobApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await JobApplication.findById(id);
    
    if (!application || application.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Job application not found'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Get job application by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job application',
      error: error.message
    });
  }
};

// Update job application status
export const updateJobApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const application = await JobApplication.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Job application not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });
  } catch (error) {
    console.error('Update job application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status',
      error: error.message
    });
  }
};

// Soft delete job application
export const deleteJobApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await JobApplication.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Job application not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job application deleted successfully'
    });
  } catch (error) {
    console.error('Delete job application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job application',
      error: error.message
    });
  }
};

// Hard delete job application (permanent)
export const hardDeleteJobApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await JobApplication.findByIdAndDelete(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Job application not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job application permanently deleted'
    });
  } catch (error) {
    console.error('Hard delete job application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete job application',
      error: error.message
    });
  }
};

// Get job application statistics
export const getJobApplicationStats = async (req, res) => {
  try {
    const stats = await JobApplication.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await JobApplication.countDocuments({ isDeleted: false });

    const result = {
      total,
      pending: 0,
      reviewing: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get job application stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};
