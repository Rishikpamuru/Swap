/**
 * Audit Logging Middleware
 * BPA Web Application - SkillSwap
 * 
 * Logs admin actions and important system events for compliance and security
 */

const { runQuery } = require('../config/database');

/**
 * Log an audit event to the database
 * @param {object} db - Database connection
 * @param {object} data - Audit data
 * @returns {Promise<void>}
 */
async function logAuditEvent(db, data) {
  const {
    userId,
    action,
    entityType,
    entityId,
    oldValue = null,
    newValue = null,
    ipAddress = null,
    userAgent = null
  } = data;
  
  try {
    await runQuery(db, `
      INSERT INTO audit_logs 
      (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      action,
      entityType,
      entityId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error(' Audit logging failed:', error.message);
    // Don't throw - audit failure shouldn't break the app
  }
}

/**
 * Middleware: Log all admin requests
 */
function logAudit(req, res, next) {
  if (!req.session || !req.session.userId) {
    return next();
  }
  const shouldLog = 
    req.session.userRole === 'admin' ||
    req.method !== 'GET' || // Log all non-GET requests
    req.path.includes('/admin/');
  
  if (shouldLog && req.app.locals.db) {
    const db = req.app.locals.db;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    
    // Log after response is sent
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        logAuditEvent(db, {
          userId: req.session?.userId || null,
          action: `${req.method} ${req.path}`,
          entityType: 'http_request',
          entityId: null,
          oldValue: null,
          newValue: { statusCode: res.statusCode },
          ipAddress,
          userAgent
        }).catch(err => {
          console.error('Audit log error:', err);
        });
      }
    });
  }
  
  next();
}

/**
 * Create an audit log helper for manual logging
 * @param {object} db - Database connection
 * @returns {function} - Async function to log audit events
 */
function createAuditLogger(db) {
  return async (userId, action, entityType, entityId, oldValue, newValue, req = null) => {
    const ipAddress = req ? (req.ip || req.connection.remoteAddress) : null;
    const userAgent = req ? req.get('user-agent') : null;
    
    await logAuditEvent(db, {
      userId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress,
      userAgent
    });
  };
}

/**
 * Get audit logs with filters
 * @param {object} db - Database connection
 * @param {object} filters - Filter options
 * @returns {Promise<Array>} - Audit log entries
 */
async function getAuditLogs(db, filters = {}) {
  const { getAll } = require('../config/database');
  
  let sql = `
    SELECT 
      al.*,
      u.username,
      u.email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  
  const params = [];
  
  // Filter by user
  if (filters.userId) {
    sql += ' AND al.user_id = ?';
    params.push(filters.userId);
  }
  
  // Filter by action
  if (filters.action) {
    sql += ' AND al.action LIKE ?';
    params.push(`%${filters.action}%`);
  }
  
  // Filter by entity type
  if (filters.entityType) {
    sql += ' AND al.entity_type = ?';
    params.push(filters.entityType);
  }
  
  // Filter by date range
  if (filters.startDate) {
    sql += ' AND al.created_at >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    sql += ' AND al.created_at <= ?';
    params.push(filters.endDate);
  }
  
  // Order by most recent
  sql += ' ORDER BY al.created_at DESC';
  
  // Limit results
  const limit = filters.limit || 100;
  sql += ' LIMIT ?';
  params.push(limit);
  
  try {
    const logs = await getAll(db, sql, params);
    
    // Parse JSON fields
    return logs.map(log => ({
      ...log,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null
    }));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}

module.exports = {
  logAudit,
  logAuditEvent,
  createAuditLogger,
  getAuditLogs
};
