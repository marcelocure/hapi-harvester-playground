# hapi-harvester

a JSONAPI 1.0 plugin for Hapi

[![Build Status](https://travis-ci.org/agco/hapi-harvester.svg?branch=develop)](https://travis-ci.org/agco/hapi-harvester)
[![Coverage Status](https://coveralls.io/repos/agco/hapi-harvester/badge.svg?branch=feature%2Fhh-30&service=github)](https://coveralls.io/github/agco/hapi-harvester?branch=develop)

## Overview

Harvester is a Hapi plugin which enables you to define [JSONAPI 1.0](http://jsonapi.org) resources in an easy, boilerplate-free manner.  

```js
// bootstrap a hapi server... and register the plugin
server.register({
    register: require('hapi-harvester')
}, function (err) {
    // define a jsonapi schema 
    var brands = {
        type: 'brands',
        attributes: {
            // use Joi to set validation constraints
            code: Joi.string(),
            description: Joi.string()
        }
    }
    // retrieve the plugin namespace from the server object
    const hh = server.plugins['hapi-harvester']
    // register the routes 
    const brandsGet = hh.route(brands)
})
```

## Features

#### JSON-API 1.0 

- [CRUD](http://jsonapi.org/format/#crud)
- [Filtering](http://jsonapi.org/format/#fetching-filtering)
- [Sorting](http://jsonapi.org/format/#fetching-sorting)
- [Pagination](http://jsonapi.org/format/#fetching-pagination)
- [Resource Relationships](http://jsonapi.org/format/#document-structure-resource-relationships) 
- [Inclusion of Linked Resources](http://jsonapi.org/format/#fetching-includes)
- [Sparse fieldsets](http://jsonapi.org/format/#fetching-sparse-fieldsets)
- [Errors](http://jsonapi.org/format/#errors)

#### Other  

- Extended filter operators : lt, gt, lte, gte
- Publish change events through [SSE](http://www.w3.org/TR/eventsource/) 



