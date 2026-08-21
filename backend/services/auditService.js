const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

const getCollection = () => getDB().collection('audits');

/**
 * Creates a new audit in the database.
 * 
 * @param {Object} auditData 
 */
const createAudit = async (auditData) => {
  const collection = getCollection();
  const audit = {
    userId: typeof auditData.userId === 'string' ? new ObjectId(auditData.userId) : auditData.userId,
    url: auditData.url,
    status: auditData.status || 'pending',
    seoScore: auditData.seoScore || 0,
    aeoScore: auditData.aeoScore || 0,
    geoScore: auditData.geoScore || 0,
    technicalScore: auditData.technicalScore || 0,
    onPageScore: auditData.onPageScore || 0,
    contentScore: auditData.contentScore || 0,
    issues: auditData.issues || [],
    recommendations: auditData.recommendations || [],
    createdAt: new Date()
  };
  const result = await collection.insertOne(audit);
  return { _id: result.insertedId, ...audit };
};

/**
 * Gets all audits for a specific user, sorted by most recent first.
 * Includes pagination and projects only required fields to avoid large payloads.
 * 
 * @param {string|ObjectId} userId 
 * @param {number} skip
 * @param {number} limit
 */
const getAuditsByUser = async (userId, skip = 0, limit = 10) => {
  const collection = getCollection();
  const queryId = typeof userId === 'string' ? new ObjectId(userId) : userId;
  return await collection
    .find({ userId: queryId })
    .project({
      url: 1,
      fetchedUrl: 1,
      seoScore: 1,
      aeoScore: 1,
      geoScore: 1,
      status: 1,
      createdAt: 1
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
};

/**
 * Gets a single audit by its document ID.
 * 
 * @param {string|ObjectId} auditId 
 */
const getAuditById = async (auditId) => {
  const collection = getCollection();
  const queryId = typeof auditId === 'string' ? new ObjectId(auditId) : auditId;
  return await collection.findOne({ _id: queryId });
};

/**
 * Updates specific fields on an existing audit document.
 *
 * @param {string|ObjectId} auditId
 * @param {Object} fields  - Key/value pairs to $set on the document
 */
const updateAudit = async (auditId, fields) => {
  const collection = getCollection();
  const queryId = typeof auditId === 'string' ? new ObjectId(auditId) : auditId;
  return await collection.updateOne(
    { _id: queryId },
    { $set: { ...fields, updatedAt: new Date() } }
  );
};

/**
 * Deletes a single audit.
 * 
 * @param {string|ObjectId} auditId 
 */
const deleteAudit = async (auditId) => {
  const collection = getCollection();
  const queryId = typeof auditId === 'string' ? new ObjectId(auditId) : auditId;
  return await collection.deleteOne({ _id: queryId });
};

/**
 * Counts total audits for a user (used for pagination metadata).
 *
 * @param {string|ObjectId} userId
 */
const countAuditsByUser = async (userId) => {
  const collection = getCollection();
  const queryId = typeof userId === 'string' ? new ObjectId(userId) : userId;
  return await collection.countDocuments({ userId: queryId });
};

module.exports = {
  createAudit,
  updateAudit,
  getAuditsByUser,
  countAuditsByUser,
  getAuditById,
  deleteAudit
};
