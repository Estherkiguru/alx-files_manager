import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

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

// Route for connecting
router.get('/connect', (req, res) => {
  AuthController.getConnect(req, res);
});

// Route for Disconnecting
router.get('/disconnect', (req, res) => {
  AuthController.getDisconnect(req, res);
});

// Route for user retrieval
router.get('/users/me', (req, res) => {
  UsersController.getMe(req, res);
});

export default router;
