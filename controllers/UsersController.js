import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    // Check for missing email or password
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }
    const hashedPassword = sha1(password);

    try {
      const collection = dbClient.db.collection('users');
      const user1 = await collection.findOne({ email });

      if (user1) {
        return res.status(400).json({ error: 'Already exist' });
      }
      collection.insertOne({ email, password: hashedPassword });
      const newUser = await collection.findOne(
        { email }, { projection: { email: 1 } },
      );
      return res.status(201).json({ id: newUser._id, email: newUser.email });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    // Retrieve user ID from Redis
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    // Find user by ID
    const user = await dbClient.users.findOne({ _id: new dbClient.ObjectId(userId) });
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const { email, _id: id } = user;
    return res.status(200).send({ id, email });
  }
}

export default UsersController;
