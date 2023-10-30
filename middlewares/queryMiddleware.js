const queryMiddleware = (req, res, next) => {
    req.pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
    };
    req.sorting = {
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: parseInt(req.query.sortOrder) || -1,
    };
    req.filters = req.query.filters ? JSON.parse(req.query.filters) : {};

    next();
};

module.exports = queryMiddleware;