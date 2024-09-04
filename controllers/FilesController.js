import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import mime from 'mime-types';
import { ObjectId } from 'mongodb';
import Queue from 'bull';
import { findUserIdByToken } from '../utils/helpers';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FilesController {
  static async postUpload(req, res) {
    const fileQueue = new Queue('fileQueue');
    // Retrieve user based on token
    const userId = await findUserIdByToken(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let fileInserted;

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const { type } = req.body;
    if (!type || !['folder', 'file', 'image'].includes(type)) { return res.status(400).json({ error: 'Missing type' }); }

    const isPublic = req.body.isPublic || false;
    const parentId = req.body.parentId || 0;
    const { data } = req.body;
    if (!data && !['folder'].includes(type)) { return res.status(400).json({ error: 'Missing data' }); }
    if (parentId !== 0) {
      const parentFileArray = await dbClient.files.find({ _id: ObjectID(parentId) }).toArray();
      if (parentFileArray.length === 0) return res.status(400).json({ error: 'Parent not found' });
      const file = parentFileArray[0];
      if (file.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing Data' });

    if (type === 'folder') {
      fileInserted = await dbClient.files.insertOne({
        userId: ObjectID(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? parentId : ObjectID(parentId),
      });
    } else {
      // Create folder for the file
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true }, () => {});
      // Create an ID and a new path to the new file
      const filenameUUID = uuidv4();
      const localPath = `${folderPath}/${filenameUUID}`;

      const clearData = Buffer.from(data, 'base64');
      await fs.promises.writeFile(localPath, clearData.toString(), { flag: 'w+' });
      await fs.readdirSync('/').forEach((file) => {
        console.log(file);
        
        if (type === 'image') {
            await fileQueue.add({ userId, fileId: fileInserted.insertedId });
        }
      });

      // Insert into the MongoDB
      fileInserted = await dbClient.files.insertOne({
        userId: ObjectID(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? parentId : ObjectID(parentId),
        localPath,
      });

      if (type === 'image') {
        await fs.promises.writeFile(localPath, clearData, { flag: 'w+', encoding: 'binary' });
        await fileQueue.add({ userId, fileId: fileInserted.insertedId, localPath });
      }
    }

    return res.status(201).json({
      id: fileInserted.ops[0]._id, userId, name, type, isPublic, parentId,
    });
  }

  static async getShow(req, res) {
    // Retrieve the user based on the token
    const token = req.headers['x-token'];
    if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }
    const keyID = await redisClient.get(`auth_${token}`);
    if (!keyID) { return res.status(401).json({ error: 'Unauthorized' }); }
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectID(keyID) });
    if (!user) { return res.status(401).json({ error: 'Unauthorized' }); }

    const idFile = req.params.id || '';
    const fileDocument = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectID(idFile), userId: user._id });
    if (!fileDocument) return res.status(404).send({ error: 'Not found' });

    return res.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  static async getIndex(req, res) {
    // Retrieve user based token
    const token = req.headers['x-token'];
    if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }
    const keyID = await redisClient.get(`auth_${token}`);
    if (!keyID) { return res.status(401).json({ error: 'Unauthorized' }); }
    const parentId = req.query.parentId || '0';
    const pagination = req.query.page || 0;
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectID(keyID) });
    if (!user) res.status(401).json({ error: 'Unauthorized' });

    const aggregationMatch = { $and: [{ parentId }] };
    let aggregateData = [
      { $match: aggregationMatch },
      { $skip: pagination * 20 },
      { $limit: 20 },
    ];
    if (parentId === 0) aggregateData = [{ $skip: pagination * 20 }, { $limit: 20 }];

    const files = await dbClient.db
      .collection('files')
      .aggregate(aggregateData);
    const filesArray = [];
    await files.forEach((item) => {
      const fileItem = {
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      filesArray.push(fileItem);
    });

    return res.send(filesArray);
  }

  static async putPublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    const keyID = await redisClient.get(`auth_${token}`);
    if (!keyID) return res.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(keyID) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id), userId: user._id });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne(
      { _id: ObjectId(id) },
      { $set: { isPublic: true } },
    );

    return res.status(200).json({ ...file, isPublic: true });
  }

  static async putUnpublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    const keyID = await redisClient.get(`auth_${token}`);
    if (!keyID) return res.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(keyID) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id), userId: user._id });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne(
      { _id: ObjectId(id) },
      { $set: { isPublic: false } },
    );

    return res.status(200).json({ ...file, isPublic: false });
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const { size } = req.query;
    const token = req.headers['x-token'];

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    const userId = await findUserIdByToken(req);
    const isAuthenticated = userId && userId.toString() === file.userId.toString();

    if (!file.isPublic && !isAuthenticated) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const localPath = file.localPath || `${folderPath}/${file._id}`;
    const mimeType = mime.lookup(localPath);

    if (size) {
      const thumbnailPath = `${localPath}_${size}`;
      if (!fs.existsSync(thumbnailPath)) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.setHeader('Content-Type', mimeType);
      return res.sendFile(thumbnailPath);
    }

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.setHeader('Content-Type', mimeType);
    return res.sendFile(localPath);
  }
}

export default FilesController;
