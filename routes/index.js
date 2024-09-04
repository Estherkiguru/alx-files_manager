import express from 'express';
import AppController from '../controllers/AppController';

const router = express.Router();

// Route for /status
router.get('/status', (req, res) => {
    AppController.getStatus(req, res);
});

// Route for /stats
router.get('/stats', (req, res) => {
    AppController.getStats(req, res);
});
export default router;
