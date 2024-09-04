import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
// import mime from 'mime-types';
import path from 'path';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    // Validate request
    if (!name) {
      return res.status(400).send({ error: 'Missing name' });
    }

    if (!['folder', 'file', 'image'].includes(type)) {
      return res.status(400).send({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).send({ error: 'Missing data' });
    }

    // Handle parentId validation
    if (parentId !== 0) {
      const parentFile = await dbClient.files.findOne({ _id: parentId });
      if (!parentFile) {
        return res.status(400).send({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).send({ error: 'Parent is not a folder' });
      }
    }

    const fileData = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      // If type is folder, only save in the DB
      const newFile = await dbClient.files.insertOne(fileData);
      return res.status(201).send(newFile.ops[0]);
    }

    // Save file on disk
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const localPath = path.join(folderPath, uuidv4());
    fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

    // Save file details in DB
    fileData.localPath = localPath;
    const newFile = await dbClient.files.insertOne(fileData);

    return res.status(201).send(newFile.ops[0]);
  }
}

export default FilesController;
