const Hapi = require('hapi'),
    hapiHarvester = require('./hapi-harvester'),
    config = require('./config')
    require_dir = require('require-directory'),
    _ = require('underscore'),
    adapter = hapiHarvester.getAdapter('mongodb'),
    server = new Hapi.Server({});

server.connection({port: config.port});
server.register([ //{register: require('hapi-swagger'), options: {apiVersion: require('./package.json').version}},
                  { register: hapiHarvester, options: {adapter: adapter({mongodbUrl: config.connectionString}) }}]
    , function () {
        var harvester = server.plugins['hapi-harvester'];
        server.start(() => loadResources(server, harvester))
    });

function loadResources(server, harvester) {
    var models = require_dir(module, './models');
    _.map(Object.keys(models), function(model){
        server.route(models[model](harvester));
    });
}