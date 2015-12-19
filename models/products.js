'use strict';
var Joi = require('joi'),
	model = {
        type: 'products',
        attributes: {
            description: Joi.string()
        },
        relationships: {
        	brands: {type: 'brands'}
        }
	  }

module.exports = function (harvesterApp) {
	return [harvesterApp.routes['get'](model),
			harvesterApp.routes['getById'](model),
			harvesterApp.routes['post'](model),
			harvesterApp.routes['patch'](model),
			harvesterApp.routes['delete'](model)]
}