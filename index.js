const Hapi = require('hapi'),
    hapiharvester = require('./hapi-harvester'),
    server = new Hapi.Server({}),
    adapter = hapiharvester.getAdapter('mongodb'),
    require_dir = require('require-directory'),
    _ = require('underscore')
    config = require('./config');

server.connection({port: 9100});
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