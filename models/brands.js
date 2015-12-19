'use strict';
var Joi = require('joi'),
	model = {
        type: 'brands',
        attributes: {
            code: Joi.string().description('Brand code'),
            description: Joi.string().description('Brand description')
        }
    }

module.exports = function (harvesterApp) {
	return [harvesterApp.routes['get'](model),
			harvesterApp.routes['getById'](model),
			harvesterApp.routes['post'](model),
			harvesterApp.routes['patch'](model),
			harvesterApp.routes['delete'](model)]
}