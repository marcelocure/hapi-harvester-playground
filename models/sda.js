'use strict';
var Joi = require('joi'),
	model = {
        type: 'sda',
        attributes: {
            code: Joi.string(),
            description: Joi.string()
        }
    }

module.exports = function (harvesterApp) {
	return [harvesterApp.routes['get'](model),
			harvesterApp.routes['getById'](model),
			harvesterApp.routes['post'](model),
			harvesterApp.routes['patch'](model),
			harvesterApp.routes['delete'](model)]
}