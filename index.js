const Hapi = require('hapi'),
    hapiHarvester = require('./hapi-harvester'),
    config = require('./config')
    require_dir = require('require-directory'),
    _ = require('underscore'),
    adapter = hapiHarvester.getAdapter('mongodb'),
    server = new Hapi.Server({}),
    mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/testing');

var promotionEvent = mongoose.model('promotionEvents', { id: String });

server.connection({port: config.port});
server.register([ //{register: require('hapi-swagger'), options: {apiVersion: require('./package.json').version}},
                  { register: hapiHarvester, options: {adapter: adapter({mongodbUrl: config.connectionString}) }}]
    , function () {
        var harvester = server.plugins['hapi-harvester'];
        server.start(() => loadResources(server, harvester))
    });

server.route({
   method: 'POST',
   path:'/brands/{id}/promote', 
   handler: function (request, reply) {
       storeEvent(encodeURIComponent(request.params.id));
       return reply('hello world');
   }
});

function loadResources(server, harvester) {
    var models = require_dir(module, './models');
    _.map(Object.keys(models), function(model){
        server.route(models[model](harvester));
    });
}

function storeEvent(id) {
    var promote = new promotionEvent({ id: id });
    promote.save(function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log('ok');
      }
    });
}