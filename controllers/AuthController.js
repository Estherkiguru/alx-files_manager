import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const [email, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const hashPwd = sha1(password);

    const user = await dbClient.users.findOne({ email, password: hashPwd });
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    const duration = (60 * 60 * 24);
    await redisClient.set(key, user._id.toString(), duration);

    res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const result = await redisClient.del(`auth_${token}`);
    if (result === 0) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    res.status(204).send();
  }
}

export default AuthController;
