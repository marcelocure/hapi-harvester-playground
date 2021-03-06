'use strict'

const _ = require('lodash')
const mongojs = require('mongojs')
const Promise = require('bluebird')
const hl = require('highland')
const Boom = require('boom')

/*
 Usage:
 ======================================
 When setting up Multi SSE (ie: SSE for multiple resources), you just need to pass in Harvester context as such:

 this.multiSSE = sse({
 context: server
 })

 You can then point an EventReader to listen from "{base_url}/changes/streaming?resouces=foo,bar,baz".

 When setting up SSE for a single route, you will need to pass the resource name:

 this.singleSSE = sse({
 singleResourceName: 'foo'
 })

 You can then point an EventReader to listen from "{base_url}/foo/changes/streaming".

 Verbs:
 ======================================
 You can also pass a "verbs" option to this module. If none is passed, SSE will only listen to "insert" events from uplog.
 Values you can pass are "post", "put" and "delete" which in turn currespond to oplog ops "i", "u" and "d".

 this.singleSSE = sse({
 context: server,
 singleResourceName: 'foo',
 verbs: ['post', 'put', 'delete']
 })
 */

function sse(config) {
    config = _.extend({}, config);
    //only listen to post events if the verb is not specified
    config.verbs = config.verbs || ['post']

    //wraps it up in an array of single item, so that it fits the current logic without too many conditions
    config.singleResourceName = config.singleResourceName && [config.singleResourceName]
    config.db = mongojs(config.context.plugins['hapi-harvester'].adapter.options.oplogConnectionString)
    config.coll = config.db.collection('oplog.rs')

    return function (req, reply) {
        let ping = 0
        req.ssePingInterval = setInterval(function () {
            reply.event({event: 'ticker', id: ping, data: ping++})
        }, 3000)
        handler(config, req, reply)
    }
}

function requestValidationMiddleware(config, req) {
    let routeNames = req.query.resources ? req.query.resources.split(',') : []

    if (config.singleResourceName) {
        routeNames = config.singleResourceName
    }

    if (routeNames.length === 0) {
        throw Boom.badRequest('You have not specified any resources, please do so by providing "resource?foo,bar" as query',
            'Requested changes on missing resource'
        )
    }

    if (!allResourcesExist(config, routeNames)) {
        throw Boom.badRequest('The follow resources don\'t exist ' + getMissingResources(config, routeNames).join(','), 'Requested changes on missing resource')
    }

    if (req.headers['last-event-id']) {
        var tsSplit = _.map(req.headers['last-event-id'].split('_'), function (item) {
            return parseInt(item, 10)
        })

        const isValidTS = _.all(tsSplit, function (ts) {
            return !isNaN(ts)
        })

        if (!isValidTS) {
            throw Boom.badRequest('Could not parse the time stamp provided', 'Invalid Timestamp')
        }
    }
}

function handler(config, req, reply) {

    requestValidationMiddleware(config, req)

    let routeNames = req.query.resources ? req.query.resources.split(',') : []

    if (config.singleResourceName) {
        routeNames = config.singleResourceName
    }

    var regex = new RegExp('.*\\.(' + routeNames.join('|') + ')', 'i')
    var docStream = hl()

    getQuery(config, req, regex)
        .then(function (query) {
            var options = {
                tailable: true,
                awaitData: true,
                timeout: false
            }
            var stream = config.coll.find(query, {}, options)

            var docStream = hl(stream)
            docStream.resume()

            var consume = hl().consume(function (err, chunk, push, next) {
                var resourceNames = _.map(routeNames, function (routeName) {
                    return new RegExp(routeName, 'i')
                })

                var matchesEitherResource = _.some(resourceNames, function (resourceName) {
                    return resourceName.test(chunk.ns)
                })

                if (matchesEitherResource) {
                    var id = chunk.ts.getHighBits() + '_' + chunk.ts.getLowBits()
                    var eventName = getEventName(routeNames[0], chunk)
                    var data = getData(chunk)

                    var filters = getFilters(req)

                    var passedFilter = _.reduce(filters, function (obj, filter) {
                        return _.filter([data], _.matches(filter))
                    }, true)

                    //if we have filters, make sure they are passed
                    if (passedFilter.length > 0 || filters.length === 0) {
                        reply.event({id: id, event: eventName, data: data})
                    }

                }
                next()
            })

            docStream.through(consume).errors(function (err) {
                handleError(err, reply, docStream)
            })
        })
        .catch(function (err) {
            handleError(err, reply, docStream)
        })
}

function handleError(err, reply, docStream) {
    reply()
    if (docStream) {
        docStream.destroy()
    }
}

function allResourcesExist(config, resourceNames) {
    return getMissingResources(config, resourceNames).length === 0
}

function getMissingResources(config, resourceNames) {
    var harvesterResourceNames = config.singleResourceName || _.keys(config.context.plugins['hapi-harvester'].schemas)
    return _.difference(resourceNames, harvesterResourceNames)
}

function getQuery(config, req, ns) {
    var lastEventId = req.headers['last-event-id']
    var coll = config.db.collection('oplog.rs')

    var verbs = config.verbs.map(function (verb) {
        return {
            'post': 'i',
            'put': 'u',
            'delete': 'd'
        }[verb]
    })

    var query = {
        ns: ns,
        op: new RegExp('(' + verbs.join('|') + ')', 'i')
    }

    return new Promise(function (resolve, reject) {
        if (req.headers['last-event-id']) {
            var tsSplit = _.map(lastEventId.split('_'), function (item) {
                return parseInt(item, 10)
            })

            query.ts = {
                $gt: new mongojs.Timestamp(tsSplit[1], tsSplit[0])
            }

            return resolve(query)
        }


        coll.find(query).sort({$natural: -1}).limit(1, function (err, items) {
            if (err) {
                return reject(err)
            }

            if (items.length === 0) {
                return coll.find().sort({$natural: -1}).limit(1, function (err, items) {
                    if (err) {
                        return reject(err)
                    }

                    query.ts = {
                        $gt: items.length ? items[0].ts : new mongojs.Timestamp()
                    }

                    return resolve(query)
                })
            }

            query.ts = {
                $gt: items[0].ts
            }

            return resolve(query)
        })
    })
}

function getFilters(req) {

    return _.chain(req.query)
        .map(function (item, key) {
            if (!_.contains(['limit', 'sort', 'offset', 'resources'], key)) {
                var filter = {}
                filter[key] = item
                return filter
            }
        })
        .filter(function (item) {
            return !!item
        })
        //converts {'foo.bar' : 'foobar'} to {foo : { bar : 'foobar' }}
        .map(function (item) {
            var keys = _.keys(item)[0].split('.')
            return _.reduce(keys, function (obj, key, index) {

                var value = (index === keys.length - 1 || keys.length === 1) ? _.values(item)[0] : {}

                if (index === 0) {
                    obj[key] = (keys.length > 1) ? {} : value
                } else {
                    obj[keys[index - 1]][key] = value
                }
                return obj
            }, {})
        })
        .value()

}

function deserialize(mongoEntity) {
    delete mongoEntity.__v
    mongoEntity.id = mongoEntity._id
    delete mongoEntity._id
    return mongoEntity
}

function getData(chunk) {
    var data

    switch (chunk.op) {
        case 'i' :
            data = deserialize(chunk.o)
            break
        case 'u' :
            data = chunk.o.$set
            break
        default :
            data = {}
    }

    return data
}

function getEventName(routeNames, chunk) {
    return routeNames + '_' + chunk.op;
}

module.exports = sse
