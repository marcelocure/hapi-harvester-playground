'use strict';
var Joi = require('joi'),
	model = {
        type: 'brands',
        attributes: {
            id: Joi.string(),
            name: Joi.string()
        }
    }

module.exports = function (harvesterApp) {
	return [harvesterApp.routes['get'](model),
			harvesterApp.routes['getById'](model),
			harvesterApp.routes['post'](model),
			harvesterApp.routes['patch'](model),
			harvesterApp.routes['delete'](model)]
}