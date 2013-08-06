
var pathModule = require('path')
var fs = require('fs')

var requiretree = require('requiretree')

module.exports = function(module){
	var dirname = pathModule.dirname(module.filename)
	console.log(module.filename + ' -> ' + dirname)

	
	return function(plantPath, srcCb, externalBeforeResolveCb){
		if(typeof(plantPath) !== 'string') throw new Error('plantPath must be a string')
	
		var pageModulePath = 'pagemodule.js'
		var moduleFunc = requireReplacingPage(plantPath, dirname, pageModulePath, srcCb, externalBeforeResolveCb)
		
		return load(dirname, plantPath, moduleFunc, pageModulePath)
	}
}

function load(dirname, plantPath, moduleFunc, pageModulePath){
	//console.log(JSON.stringify([plantPath, dirname]))
	//plantPath = pathModule.resolve(plantPath, dirname)

	return {
		plant: function(duringCb){
		
			
			var pathModuleRealPath
			var rootFilePath = moduleFunc(function(generationFolder){
				pathModuleRealPath = generationFolder + pageModulePath
				fs.writeFileSync(pathModuleRealPath, '', {mode: 0444})
				if(duringCb) duringCb(generationFolder)
				
				
			})
			
			var serverListeners = {}
			function addServerListener(eventName, cb){
				var list = serverListeners[eventName]
				if(!list) list = serverListeners[eventName] = []
				list.push(cb)
			}
			var serverFacade = {
				/*click: function(selector){
				},
				exists: function(selector){
				}*/
				on: function(eventName, cb){
					addServerListener(eventName, cb)
				}
			}

	
			//var moduleContent = ''
	
			var listeners = {}
			function addListener(eventName, cb){
				var list = listeners[eventName]
				if(!list) list = listeners[eventName] = []
				list.push(cb)
			}
				
			serverFacade.end = function(){
				//TODO
			}
			
			var bodyHtml = ''
			serverFacade.getHtml = function(){
				return bodyHtml
			}
			
			var pageModule = require(pathModuleRealPath)
			pageModule.server = serverFacade//used by libraries like whittle to publish methods for triggering events or querying/validating DOM/browser state
			pageModule.go = function(url){//replaces window.location = '...'
			}
			pageModule.goAnchor = function(anchorName){//replaces window.location.hash = '...'
			}
			pageModule.ready = function(cb){
				//console.log('added ready listener')
				addListener('ready', cb)
			}
			pageModule.on = function(eventName, cb){
				addListener(eventName, cb)
			}
			pageModule.fireGlobalEvent = function(eventName){
				var arr = listeners[eventName]
				if(arr){
						arr.forEach(function(rl){
							rl()
						})
					}
			}
			
			pageModule.setBodyHtml = function(html){
				//console.log('setBodyHtml')
				bodyHtml = html
			}
			
			
			return {
				run: function(context){
					context = context || {}
		
					
					pageModule.params = context//these values are set by the web server and passed to the browser/client.
			
					//issue ready event
					console.log('issuing ready event')
					if(listeners.ready){
						listeners.ready.forEach(function(rl){
							rl()
						})
					}
					
					require(rootFilePath)
			
					return serverFacade
				}
			}
		}
	}
}

var coreStubs = {
	'timers': __dirname+'/corestub.js'
}
function requireReplacingPage(path, baseDir, pageModulePath, srcCb, externalBeforeResolveCb){
	if(!pageModulePath) throw new Error('must provide')
	
	function beforeResolveCb(reqName, sourcePath, sourceSrc){
	
		if(reqName === 'fpage'){
			console.log('reqName: ' + reqName)
			return {path: './'+pageModulePath, noGeneration: true}//gfg
		}
		
		if(externalBeforeResolveCb) return externalBeforeResolveCb(reqName, sourcePath, sourceSrc)
	}

	function fileCb(path, sourcePath, sourceSrc, isCore){
		if(isCore) return path
		
		if(coreStubs[path]){
			console.log('stubbed core module: ' + path)
			return coreStubs[path]
		}
	}

	function includeCb(name, path, src, sourcePath, sourceSrc){
		//console.log(sourcePath + ' required ' + name + ' -> ' + path)  
	}
	
	//console.log(JSON.stringify([path, baseDir]))

	var moduleFunc = requiretree(path, baseDir, fileCb, includeCb, beforeResolveCb, srcCb)

	if(!moduleFunc) throw new Error('something went wrong with requiretree - no moduleFunc returned')
	
	return moduleFunc
}


