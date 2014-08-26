mdock
-----

(m)ultiple (dock)ers

![Container Ships](https://github.com/binocarlos/mdock/raw/master/ships.jpg)

combine multiple docker servers as though they were one massive docker

similar to the [libswarm](https://github.com/docker/libswarm) aggregate backend

## install

```
$ npm install mdock
```

## usage

An mdock proxy will route HTTP requests from the standard docker client back to a collection of docker hosts.

You pass functions to decide on routing and to list the current inventory.

```js
var http = require('http')
var mdock = require("mdock")

var dockers = mdock()

// we need a list of all servers in our cluster
dockers.on('list', function(next){

	// we can load the list from a database
	// it should return an array of server objects
	listServers(next)
})

// we need to route a container onto a single server
dockers.on('route', function(info, next){
	if(info.container){
		// route based on the container info
		var containerName = info.name
		var containerInfo = info.container

		// you can remap properties of the container before it reaches the docker server
		next(null, server)
	}
	else if(info.image){
		// route based on the image name
		var imageName = info.image
		next(null, server)
	}
})

dockers.on('map', function(info, next){

	// here we can change properties of the info.container before it is launched
	// we can also study the image for exposed ports and volumes
	
})

dockers.on('start', function(info, next){

	// here we can change properties of the info.boot record
	// the container and image have been created and so are immutable
	
})

var server = http.createServer(function(req, res){

	// we can do custom auth/routing logic here
	dockers.handle(req, res)	
})

// this is important if we want docker attach to work
server.httpAllowHalfOpen = true

// we now have a multi-docker server compatable with the standard docker client
server.listen(80)
```

## api

#### `var dockers = mdock()`

Create a new mdock proxy

## events

#### `dockers.on('route', function(info, next){})`

Called when a new container needs allocating to a docker server

This function is your chance to customize your network by changing what server / environment variables etc

if it is a container then info is an object with the following properties:

 * name - the name of the container
 * image - the name of the image
 * container - the JSON object describing the container

if it is an image, then info is an object with the following properties:

 * image - the name of the image

It is up to you to keep state between `POST /containers/create` and `POST /images/create` for `docker run` commands

Call next with a string representing the docker server to send the request to e.g. `127.0.0.1:2375`

Any changes made to the info will apply to the forwarded request - this lets you intercepts create requests and route them where you choose and change environment variables etc

```js
dockers.on('route', function(info, next){
	doSomeAsyncStuff(function(err, meta){
		info.container.name = meta.name
		next(null, meta.server)
	})
})
```

#### `dockers.on('map', function(info, next){})`

Called just before calling /containers/create but once the image has been downloaded onto the machine

Info is an object with the following properties:

 * name - the name of the container (immutable)
 * image - a JSON object describing the image (immutable)
 * backend - a JSON object describing the host (immutable)
 * container - a JSON object describing the container (mutable)

You can change the properties of container - image is immutable but contains the data for the image (this can be used to discover ports from within the Dockerfile not mentioned in the docker run command)

The backend is the host the container is being routed to.

```js
dockers.on('map', function(info, next){

	// read properties of the info.image
	// change properties of the info.container

	next()
})
```


#### `dockers.on('start', function(info, next){})`

 * name - the name of the container (immutable)
 * image - a JSON object describing the image (immutable)
 * backend - a JSON object describing the host (immutable)
 * container - a JSON object describing the container (immutable)
 * boot - a JSON object describing the boot record (mutable)

Called when a request to /containers/start is captured.

containerJSON and imageJSON are the records loaded from the already routed docker server and are immutable.

bootJSON is the JSON body of the /containers/start request and can be changed

```js
dockers.on('map', function(info, next){

	// change properties of the info.boot
	// read properties of the image and container

	next()
})
```

#### `dockers.on('list', function(next){})`

Called when the proxy needs a list of all current servers

An array of docker endpoint strings should be returned

```js
var dockerServers = [{
	hostname:'node1',
	docker:'192.168.8.120:2375'
},{
	hostname:'node2',
	docker:'192.168.8.121:2375'
},{
	hostname:'node3',
	docker:'192.168.8.122:2375'
}]

dockers.on('list', function(next){
	next(null, dockerServers)
})
```

#### `server.httpAllowHalfOpen`

Because of the way docker attach works - you must set this property to true on the http server to allow attach traffic to travel via the proxy

```js
// this is important if we want docker attach to work
server.httpAllowHalfOpen = true
server.listen(80)
```

## license

MIT