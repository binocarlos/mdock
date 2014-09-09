var hyperprox = require('hyperprox')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var Router = require('./router')
var Handlers = require('./handlers')

function MDock(){
	EventEmitter.call(this)
	var self = this;	
	this.router = Router()
	this.handlers = Handlers()

	// the api handlers that target a specific server
	// will set the X-MDOCK-HOST header to do the routing
	this.backends = hyperprox(function(req, next){
		if(!req.headers['X-MDOCK-HOST']){
			return next('no mdock host found')
		}
		var address = req.headers['X-MDOCK-HOST'] || ''
		address = address.indexOf('http')==0 ? address : 'http://' + address
		next(null, req.headers['X-MDOCK-HOST'])
	})

	this.backendsproxy = this.backends.handler()

	// choose a server for a new container
	this.handlers.on('route', function(info, next){
		self.emit('route', info, next)
	})

	this.handlers.on('map', function(info, next){
		self.emit('map', info, next)
	})

	this.handlers.on('start', function(info, next){
		self.emit('start', info, next)
	})

	// we need a list of servers
	this.handlers.on('list', function(next){
		self.emit('list', next)
	})

	// handle a direct proxy
	this.handlers.on('proxy', function(req, res, address){
		req.headers['X-MDOCK-HOST'] = address
		self.backendsproxy(req, res)
	})

	this.router.on('containers:ps', this.handlers.listContainers)
	this.router.on('containers:create', this.handlers.createContainer)
	this.router.on('containers:start', this.handlers.startContainer)
	this.router.on('containers:attach', this.handlers.attachContainer)
	this.router.on('images:create', this.handlers.createImage)

	// this is a generic handler for any request targeted at a specific container name
	// it expects req.headers['X-MDOCK-CONTAINER'] to be set
	this.router.on('containers:targetid', this.handlers.targetid)
}

util.inherits(MDock, EventEmitter)

MDock.prototype.handler = function(){
	return this.handle.bind(thid)
}

MDock.prototype.handle = function(req, res){
	this.emit('request', req, res)
	this.router.handler(req, res)
}

MDock.prototype.find = function(name, done){

	this.handlers.find(name, done)
	
}

module.exports = function(){
	return new MDock()
}