const pool = require('../config/db');

const apiKeyMiddleware = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return next();
  }

  try {
    const result = await pool.query('SELECT * FROM merchants WHERE api_key = $1', [apiKey]);

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    req.merchant = result.rows[0];
    next();
  } catch (err) {
    console.error('API KEY MIDDLEWARE ERROR:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = apiKeyMiddleware;
