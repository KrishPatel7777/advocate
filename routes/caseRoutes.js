/**
 * Case Routes - API Endpoints for Advocate Reminder System
 * All routes are protected by Firebase Authentication middleware
 */

const express = require('express');
const router = express.Router();

// Import controller functions
const {
  getAllCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  getUpcomingCases,
  getCaseStats,
  searchCases
} = require('../controllers/caseController');

// Import authentication middleware
const { verifyFirebaseToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
// This ensures all routes below require a valid Firebase token
router.use(verifyFirebaseToken);

// ==================== CORE CRUD ROUTES ====================

/**
 * @route   GET /api/cases
 * @desc    Get all cases for authenticated user
 * @access  Private
 */
router.get('/', getAllCases);

/**
 * @route   POST /api/cases
 * @desc    Create a new case
 * @access  Private
 * @body    { clientName, caseTitle, description, dueDate }
 */
router.post('/', createCase);

/**
 * @route   GET /api/cases/search
 * @desc    Search cases by client name or case title
 * @access  Private
 * @query   ?q=searchTerm
 * @note    Must be before /:id route to avoid conflict
 */
router.get('/search', searchCases);

/**
 * @route   GET /api/cases/stats
 * @desc    Get case statistics (total, overdue, upcoming, etc.)
 * @access  Private
 * @note    Must be before /:id route to avoid conflict
 */
router.get('/stats', getCaseStats);

/**
 * @route   GET /api/cases/upcoming/:days
 * @desc    Get cases due in next N days
 * @access  Private
 * @params  days (number) - number of days to look ahead
 * @note    Must be before /:id route to avoid conflict
 */
router.get('/upcoming/:days', getUpcomingCases);

/**
 * @route   GET /api/cases/:id
 * @desc    Get single case by ID
 * @access  Private
 * @params  id - MongoDB ObjectId
 */
router.get('/:id', getCaseById);

/**
 * @route   PUT /api/cases/:id
 * @desc    Update case by ID
 * @access  Private
 * @params  id - MongoDB ObjectId
 * @body    { clientName, caseTitle, description, dueDate }
 */
router.put('/:id', updateCase);

/**
 * @route   DELETE /api/cases/:id
 * @desc    Delete case by ID
 * @access  Private
 * @params  id - MongoDB ObjectId
 */
router.delete('/:id', deleteCase);

// ==================== EXPORT ROUTER ====================

module.exports = router;