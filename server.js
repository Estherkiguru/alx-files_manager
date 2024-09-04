import express from 'express';
import routes from './routes/index';

// Create the Express app
const app = express();

// Use the imported routes
app.use('/', routes);

// Start server on port 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
