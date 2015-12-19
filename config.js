'use strict';
var config = {};
config.connectionString = process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/brandsdb';
module.exports = config;