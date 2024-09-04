import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController'; import FilesController from '../controllers/FilesController';

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

// Route for file upload
router.post('/files', (req, res) => {
  FilesController.postUpload(req, res);
});

// Route for retrieving a file
router.get('/files/:id', (req, res) => {
  FilesController.getShow(req, res);
});

// Route for all users
router.get('/files', (req, res) => {
  FilesController.getIndex(req, res);
});

export default router;
