const { sendRes, sendError } = require('../../shared');
const { searchService } = require('../services/search.service');

async function health(req, res) {
  return sendRes(res, await searchService.health(), 'OK');
}

async function search(req, res) {
  try {
    const result = await searchService.search(req.query);
    return sendRes(res, result, 'Search OK');
  } catch (err) {
    return sendError(res, err.message || 'Search failed', err.httpStatus || 500);
  }
}

async function suggestions(req, res) {
  try {
    const result = await searchService.suggestions(req.query.keyword || '');
    return sendRes(res, result, 'OK');
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function hot(req, res) {
  try {
    const result = await searchService.hot();
    return sendRes(res, result, 'OK');
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function saveHistory(req, res) {
  try {
    await searchService.saveHistory(req.user.userId, req.body);
    return sendRes(res, null, 'History saved');
  } catch (err) {
    return sendError(res, err.message || 'Save failed', err.httpStatus || 500);
  }
}

async function history(req, res) {
  try {
    const result = await searchService.history(req.user.userId, req.query);
    return sendRes(res, result, 'OK');
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function clearHistory(req, res) {
  try {
    await searchService.clearHistory(req.user.userId);
    return sendRes(res, null, 'Cleared');
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

module.exports = {
  health,
  search,
  suggestions,
  hot,
  saveHistory,
  history,
  clearHistory,
};
