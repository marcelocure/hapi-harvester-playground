const Hapi = require('hapi'),
    hapiharvester = require('./hapi-harvester'),
    config = require('./config')
    require_dir = require('require-directory'),
    _ = require('underscore'),
    adapter = hapiharvester.getAdapter('mongodb'),
    server = new Hapi.Server({});

server.connection({port: config.port});
server.register({
    register: hapiharvester,
     options: {
        adapter: adapter({mongodbUrl: config.connectionString})
      }
}, function () {
    var harvester = server.plugins['hapi-harvester'];
    server.start(() => {
                            var models = require_dir(module, './models');
                            _.map(Object.keys(models), function(model){
                                server.route(models[model](harvester));
                            });
                        })
});