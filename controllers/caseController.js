/**
 * Case Controller - Business Logic for Advocate Reminder System
 * Handles all CRUD operations for legal cases with Firebase Auth integration
 */

const Case = require('../models/Case');

/**
 * @desc    Get all cases for authenticated user
 * @route   GET /api/cases
 * @access  Private
 */
exports.getAllCases = async (req, res) => {
  try {
    // User ID is attached to req by auth middleware after Firebase token verification
    const userId = req.user.uid;

    // Fetch all cases belonging to this user, sorted by due date (ascending)
    const cases = await Case.find({ userId })
      .sort({ dueDate: 1 })
      .select('-__v'); // Exclude version key

    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases
    });

  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cases',
      error: error.message
    });
  }
};

/**
 * @desc    Get single case by ID
 * @route   GET /api/cases/:id
 * @access  Private
 */
exports.getCaseById = async (req, res) => {
  try {
    const userId = req.user.uid;
    const caseId = req.params.id;

    // Find case by ID and ensure it belongs to the authenticated user
    const caseData = await Case.findOne({ 
      _id: caseId, 
      userId: userId 
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found or unauthorized access'
      });
    }

    res.status(200).json({
      success: true,
      data: caseData
    });

  } catch (error) {
    console.error('Error fetching case:', error);
    
    // Handle invalid MongoDB ObjectId format
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid case ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch case',
      error: error.message
    });
  }
};

/**
 * @desc    Create new case
 * @route   POST /api/cases
 * @access  Private
 */
exports.createCase = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { clientName, caseTitle, description, dueDate } = req.body;

    // Validation
    if (!clientName || !caseTitle || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide clientName, caseTitle, and dueDate'
      });
    }

    // Validate date format
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use ISO format (YYYY-MM-DD)'
      });
    }

    // Check if due date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDateObj < today) {
      return res.status(400).json({
        success: false,
        message: 'Due date cannot be in the past'
      });
    }

    // Create new case
    const newCase = await Case.create({
      userId,
      clientName: clientName.trim(),
      caseTitle: caseTitle.trim(),
      description: description ? description.trim() : '',
      dueDate: dueDateObj,
      reminderSent: false
    });

    res.status(201).json({
      success: true,
      message: 'Case created successfully',
      data: newCase
    });

  } catch (error) {
    console.error('Error creating case:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create case',
      error: error.message
    });
  }
};

/**
 * @desc    Update case by ID
 * @route   PUT /api/cases/:id
 * @access  Private
 */
exports.updateCase = async (req, res) => {
  try {
    const userId = req.user.uid;
    const caseId = req.params.id;
    const { clientName, caseTitle, description, dueDate } = req.body;

    // Find case first to verify ownership
    const existingCase = await Case.findOne({ 
      _id: caseId, 
      userId: userId 
    });

    if (!existingCase) {
      return res.status(404).json({
        success: false,
        message: 'Case not found or unauthorized access'
      });
    }

    // Prepare update object
    const updateData = {};

    if (clientName) updateData.clientName = clientName.trim();
    if (caseTitle) updateData.caseTitle = caseTitle.trim();
    if (description !== undefined) updateData.description = description.trim();
    
    // Handle due date update
    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      
      if (isNaN(dueDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDateObj < today) {
        return res.status(400).json({
          success: false,
          message: 'Due date cannot be in the past'
        });
      }

      updateData.dueDate = dueDateObj;
      
      // Reset reminderSent if date changed
      if (existingCase.dueDate.getTime() !== dueDateObj.getTime()) {
        updateData.reminderSent = false;
      }
    }

    // Update timestamp
    updateData.updatedAt = new Date();

    // Update the case
    const updatedCase = await Case.findByIdAndUpdate(
      caseId,
      { $set: updateData },
      { 
        new: true, // Return updated document
        runValidators: true // Run schema validators
      }
    );

    res.status(200).json({
      success: true,
      message: 'Case updated successfully',
      data: updatedCase
    });

  } catch (error) {
    console.error('Error updating case:', error);

    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid case ID format'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update case',
      error: error.message
    });
  }
};

/**
 * @desc    Delete case by ID
 * @route   DELETE /api/cases/:id
 * @access  Private
 */
exports.deleteCase = async (req, res) => {
  try {
    const userId = req.user.uid;
    const caseId = req.params.id;

    // Find and delete in one operation, ensuring ownership
    const deletedCase = await Case.findOneAndDelete({
      _id: caseId,
      userId: userId
    });

    if (!deletedCase) {
      return res.status(404).json({
        success: false,
        message: 'Case not found or unauthorized access'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Case deleted successfully',
      data: {
        id: deletedCase._id,
        caseTitle: deletedCase.caseTitle
      }
    });

  } catch (error) {
    console.error('Error deleting case:', error);

    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid case ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete case',
      error: error.message
    });
  }
};

/**
 * @desc    Get cases due in next N days
 * @route   GET /api/cases/upcoming/:days
 * @access  Private
 */
exports.getUpcomingCases = async (req, res) => {
  try {
    const userId = req.user.uid;
    const days = parseInt(req.params.days) || 7; // Default 7 days

    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        message: 'Days must be between 1 and 365'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);

    const cases = await Case.find({
      userId,
      dueDate: {
        $gte: today,
        $lte: futureDate
      }
    }).sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: cases.length,
      days: days,
      data: cases
    });

  } catch (error) {
    console.error('Error fetching upcoming cases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming cases',
      error: error.message
    });
  }
};

/**
 * @desc    Get statistics for user's cases
 * @route   GET /api/cases/stats
 * @access  Private
 */
exports.getCaseStats = async (req, res) => {
  try {
    const userId = req.user.uid;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total cases
    const totalCases = await Case.countDocuments({ userId });

    // Overdue cases
    const overdueCases = await Case.countDocuments({
      userId,
      dueDate: { $lt: today }
    });

    // Cases due today
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const dueTodayCases = await Case.countDocuments({
      userId,
      dueDate: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Upcoming cases (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const upcomingCases = await Case.countDocuments({
      userId,
      dueDate: {
        $gte: today,
        $lte: nextWeek
      }
    });

    // Reminders sent count
    const remindersSent = await Case.countDocuments({
      userId,
      reminderSent: true
    });

    res.status(200).json({
      success: true,
      data: {
        totalCases,
        overdueCases,
        dueTodayCases,
        upcomingCases,
        remindersSent
      }
    });

  } catch (error) {
    console.error('Error fetching case statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Search cases by client name or case title
 * @route   GET /api/cases/search?q=searchTerm
 * @access  Private
 */
exports.searchCases = async (req, res) => {
  try {
    const userId = req.user.uid;
    const searchTerm = req.query.q;

    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search term'
      });
    }

    // Case-insensitive search in clientName and caseTitle
    const cases = await Case.find({
      userId,
      $or: [
        { clientName: { $regex: searchTerm, $options: 'i' } },
        { caseTitle: { $regex: searchTerm, $options: 'i' } }
      ]
    }).sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: cases.length,
      searchTerm: searchTerm,
      data: cases
    });

  } catch (error) {
    console.error('Error searching cases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search cases',
      error: error.message
    });
  }
};