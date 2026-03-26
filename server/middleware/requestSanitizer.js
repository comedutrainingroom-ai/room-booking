const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    for (const key of Object.keys(obj)) {
        if (key.startsWith('$')) {
            delete obj[key];
            continue;
        }

        sanitizeObject(obj[key]);
    }

    return obj;
};

const requestSanitizer = (req, res, next) => {
    sanitizeObject(req.body);
    sanitizeObject(req.params);
    sanitizeObject(req.query);
    next();
};

module.exports = {
    sanitizeObject,
    requestSanitizer
};
