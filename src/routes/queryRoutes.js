import express from 'express';
import  { processNLQ,executeQuery,getAuditLogs } from '../controllers/queryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
const router = express.Router();
router.post('/nlq', authenticateToken, processNLQ);
router.post('/execute', authenticateToken, executeQuery);
router.get('/audit-log', authenticateToken, getAuditLogs);
export default router;
