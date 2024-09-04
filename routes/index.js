import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const router = express.Router();

// Route for /status
router.get('/status', (req, res) => {
  AppController.getStatus(req, res);
});

// Route for /stats
router.get('/stats', (req, res) => {
  AppController.getStats(req, res);
});

// Route for new user
router.post('/users', (req, res) => {
  UsersController.postNew(req, res);
});

export default router;
