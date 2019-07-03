/*!
 * kjsdoTransport.js v2.0.0
 * (c) 2017 Victor Reiswich
 * Released under the MIT License.
 * https://github.com/reiswich/kjsdoTransport
 * JSDO version ab 4.3.1 - 6.0 +
 * 
 */
;
"use strict";
( function ( window ) {
	var jsdo = function ( object ) {
		var that = this;
		if ( typeof object !== "object" ) {
			console.error( "Kendo JSDO Data 'jsdo' Fehler, 'Keine Objekt wurde �bergeben'" );
		} else {
			object = jsdo._extend_obj( object );
				new jsdo._JSDOTransport( object.serviceURI, object.catalogURI, object.resourceName, object, function ( jsdo ) {
					// als default kendo == true
					if ( object.kendo === true || typeof object.kendo !== "boolean" || object.DataSource) {
						object[ "transport" ] = jsdo.transport;
						var clbck = object.callback;
						delete object.kendo;
						delete object.callback;
						// clbck( jsdo, new kendo.data.DataSource( object ) );
						// clbck( jsdo, new kendo.data.DataSource( {transport:jsdo.transport} ) );

						if (!object.DataSource ) {
							object.DataSource = {};
							//object.DataSource[ "type" ] = "jsdo";
						}
						object.DataSource[ "transport" ] = jsdo.transport;
						
						clbck( jsdo, new kendo.data.DataSource( object.DataSource ) );
					} else {
						object.callback( jsdo );
					}
				} );
		}
	};

	var methods = {
		"setdefault" : function ( object ) {
			$.extend( jsdo._JSDO[ "setdefault" ], object );
		},

		notauth : function () {
			alert( "authentication required" );
		},

		_extend_obj : function ( object ) {
			if ( object.filter ) {
				object.serverFiltering = true;
			}
			return $.extend( {}, jsdo._JSDO[ "setdefault" ], object );
		},

		_JSDOTransport : kendo.Class.extend( {
			addOptions : function ( data, filter, callback ) {
				return {
					success : callback,
					error : callback,
					data : data || "",
					filter : filter || ""
				};
			},
			// filter
			read : function ( filter, callback ) {
				var that = this;
				if ( typeof filter === "function" ) {
					callback = filter;
					filter = ( that.settings && that.settings.filter ) || "";
				}
				that.transport.read( that.addOptions( "", filter, callback ) );
			},

			multisave : function ( data, callback ) {
				var that = this;
				var jsdo = that.jsdo;
				var options = this.addOptions( data, "", callback );
				var is_more = false;
				if ($.isArray(data)){
				        is_more = true;
                        for ( var i in data ) {
                            jsdo.add( data[ i ] );
                        }
                        
                        
                        
                        
                    }else{
                        jsdo.add( options.data );
                    }
				
				
				for ( var i in data ) {
					if ( data[ i ].dirty ) {
						if ( data[ i ]._id ) {
							that._updateJsRecord( data[ i ], options.error );
						} else {
							jsdo.add( data[ i ] );
						}
					}
				}
				jsdo.subscribe( 'afterSaveChanges', function ( jsdo, success, request ) {
					var len = request.batch.operations.length;
					var i, j, error = "", errors, errorType;

					if ( success ) {
						jsdo.acceptChanges();
						if ( request.batch && request.batch.operations instanceof Array && request.batch.operations.length == 1 ) {
							data = request.batch.operations[ 0 ].jsrecord.data;
							jsdo.foreach( function ( jsrecord ) {
								/* reference the record/field as jsrecord.data.<fieldName> . . . */

							} );
						}
						that._runresponsecallback( request, data );
						options.success.call( that, data );
					} else {
						/* for each CUD operation */
						for ( var idx = 0; idx < len; idx++ ) {

							var operationEntry = request.batch.operations[ idx ];

							switch ( operationEntry.operation ) {
								case 1:
									console.log( "Operation: Create" );
									break;
								case 3:
									console.log( "Operation: Update" );
									break;
								case 4:
									console.log( "Operation: Delete" );
									break;
								default:
									console.log( "Operation: Unexpected Code:" + operationEntry.operation );
							}

							if ( !operationEntry.success ) {

								/* handle operation error condition */
								if ( operationEntry.response && operationEntry.response._errors && operationEntry.response._errors.length > 0 ) {

									var lenErrors = operationEntry.response._errors.length;
									for ( var idxError = 0; idxError < lenErrors; idxError++ ) {

										var error = operationEntry.response._errors[ idxError ];
										var errorMsg = error._errorMsg;
										var errorNum = error._errorNum;
										/* handle error results . . . */

									}
								}
							} else {
								/* operation succeeded . . . */
							}
						}

						options.error.call( that, "", that._runresponsecallback( request, "" ) );
					}

				} );
				jsdo.autoApplyChanges = false;
				jsdo.saveChanges( true );
			},

			save : function ( data, callback ) {
				var that = this;
				if ( typeof data._id == "undefined" || data._id == "" ) {
					that.create( data, callback );
				} else {
					that.update( that.addOptions( data, "", callback ) );
				}
			},
			create : function ( data, callback ) {
				this.transport.create( this.addOptions( data, "", callback ) );
			},

			update : function ( data, callback ) {
				this.transport.update( data.data ? data : ( this.addOptions( data, "", callback ) ) );
			},
			destroy : function ( data, callback ) {
				this.transport.destroy( this.addOptions( data, "", callback ) );
			},
			invoke : function ( name, data, callback ) {
				this.transport.invoke(  this.addOptions( {data:data,name:name}, "", callback ));
			},

			// The `init` method will be called when a new instance is created
			init : function ( serviceURI, catalogURI, resourceName, settings, main_callback ) { // Create and configure the session object
				var that = this;
				that.settings = settings;
				that.error = settings.error;
				that.success = settings.success;
					that._createSession( serviceURI, catalogURI, function ( sess, err ) {
						that.jsdo = new progress.data.JSDO( {
							name : resourceName
						// autoApplyChanges : false
						} );
						// Create proxies to internal methods to maintain the correct 'this' reference
						that.transport = {
							read : $.proxy( that._read, that ),
							create : $.proxy( that._create, that ),
							update : $.proxy( that._update, that ),
							destroy : $.proxy( that._destroy, that ),
							invoke : $.proxy( that._invoke, that )
//							invoke : that.jsdo.invoke
							
						};
						if ( settings.parameterMap ) {
							that.transport[ "parameterMap" ] = $.proxy( settings.parameterMap, that );
						}

						if ( typeof main_callback == "function" ) {
							main_callback.call( that, that );
						}
					} ); // Create the JSDO
			}, // methods with an "_" are private and are only to be used by the class
			_checkAuth : function ( serviceURI, uname, pw ) {
				jsdo._JSDO.is_auth( this.session );
				// this.session.login( serviceURI, uname || "", pw || "" );
			},

			_createSession : function ( serviceURI, catalogURI, callback ) {
				var that = this;
				that.session = jsdo._JSDO.get_session( serviceURI );
				jsdo._JSDO.is_auth( function ( result ) {
					if ( !result.status ) {
						jsdo._JSDO.addCatalog( catalogURI, callback, that.session );
					}
				}, that.session );
			},

			_runresponsecallback : function ( request, data ) {
				var that = this;
				if ( request.response && request.response.status_code === 401 ) {
					jsdo.notauth();
				} else {

					if ( !data || data.length === 0 ) {
						var errors;
						var errorType;
						var returnText = "";
						errors = that.jsdo.getErrors();
						for ( var i = 0; i < errors.length; i++ ) {
							switch ( errors[ i ].type ) {
								case progress.data.JSDO.DATA_ERROR:
									errorType = "Server Data Error: ";
									break;
								case progress.data.JSDO.RETVAL:
									errorType = "Server App Return Value: ";
									break;
								case progress.data.JSDO.APP_ERROR:
									errorType = "Server App Error #" + errors[ i ].errorNum + ": ";
									break;
								case progress.data.JSDO.ERROR:
									errorType = "Server General Error: ";
									break;
							}
							errorType = "ERROR: " + errorType + errors[ i ].error;
							console.error( errorType );
							returnText = returnText + " " + errorType;
							if ( errors[ i ].id ) {
								console.error( "DEBUG: Record id: " + errors[ i ].id );
								/*
								 * Possibly log record change information based on data error record object found in the request.jsrecords using getId()
								 */
							}
							if ( errors[ i ].responseText ) {
								console.error( "HTTP FULL TEXT: " + errors[ i ].responseText );
							}
						}
						return returnText;

					}
				}

			},

			// the transports needed by the DataSource
			_read : function ( options ) {
				var that = this;
				// !options?options = that.options:options;
				var that_jsdo = that.jsdo;
				that_jsdo.subscribe( 'AfterFill', function callback ( AfterFill_jsdo, success, request ) {
					AfterFill_jsdo.unsubscribe( 'AfterFill', callback, AfterFill_jsdo );
					if ( success ) {
						var data;
						try {
							data = AfterFill_jsdo.getData();
						} catch ( e ) {
							if ( !data ) {
								data = request.response[ AfterFill_jsdo._dataSetName ];
							}
						}
						that._runresponsecallback( request, data );
						if (that.settings.after_read){
							that.settings.after_read(that, data, options, function(that, data, options){
								options.success.call( that, data );
							});
						}else{
							options.success.call( that, data );
						}
						
					} else {
						options.error.call( that, "", that._runresponsecallback( request, "" ), request.xhr.status, request.exception );
					}
				}, that_jsdo );

				var get_filter = function () {
					if (options.filter){
						return options.filter;
					}else{
						var filters = options.data.filter;
						if ( filters) {
							var ablFilter = progress.util._convertToABLWhereString("", filters);
							var dic = {
									ablFilter: ablFilter,
									//sqlQuery: sqlQuery,
//									orderBy: sortFields,
//									skip: options.data.pageSize || options.data.skip,
									top: options.data.pageSize || options.data.top,
									id: options.data.id
								};
							if (options.data.sort){
								dic.orderBy = progress.util._convertToSQLQueryString("", options.data.sort, true)
							}
							return JSON.stringify(dic);
						}
					}
				};
				if (that.settings.before_read){
					that.settings.before_read(that, options, function(that, data, options){
						that_jsdo.fill( get_filter() );
					});
				}else{
					that_jsdo.fill( get_filter() );
				}	
				// jsdo.fill(options.filter);
			},
			
			
			is_submit_evemt: function(data, jsdo){
				var is_more = false;
				var con = 1;
				if ($.isArray(data) && data.length > 1){
					is_more = true;
					data = JSON.parse(JSON.stringify(data));
					jsdo.autoApplyChanges = false;
					for ( var i in data ) {
						con = con + 1;
						if (typeof data[ i ].seq == "undefined"){
							data[ i ].seq = parseInt(con); // new Date().getTime() 
						}
						jsdo.add(data[i]);
					}
				}else{
					jsdo.add(data);
				}
				return is_more;
			},
			
			
			_create : function ( options ) {
				( function ( options ) {
					var that = this;
					var jsdo = that.jsdo;
					if ( options.data && options.data._id ) {
						that.transport.update.call( that, options );
						return;
					}
					// !options?options = that.options:options;
					
					var is_more = that.is_submit_evemt(options.data, jsdo);
					
					jsdo.subscribe( 'AfterSaveChanges', function callback ( jsdo, success, request ) {
						jsdo.unsubscribe( 'AfterSaveChanges', callback, jsdo );
						var data = [];
						if ( success ) {
							if (request.fnName == "_submit" && request.jsrecords.length){
								for (var i in request.jsrecords){
									data.push(request.jsrecords[i].data);
								}
							}else{
								if ( request.batch && request.batch.operations instanceof Array && request.batch.operations.length == 1 ) {
									data = request.batch.operations[ 0 ].jsrecord.data;
								}
							}
							that._runresponsecallback( request, data );
							options.success.call( that, data );
						} else {
							options.error && options.error.call( that, "", that._runresponsecallback( request, "" ));
						}
					}, jsdo );
					
					jsdo.saveChanges(is_more);
					
//					if ($.isArray(options.data)){
//					//	jsdo.autoApplyChanges = false;
//						jsdo.saveChanges( true );
//					}else{
//						jsdo.saveChanges();
//					}
					

				} ).call( this, options );

			},

			_update : function ( options ) {
				var that = this;
				var jsdo = that.jsdo;
				var is_more = false;
				var data = options.data;
				if ($.isArray(data) && data.length > 1){
					is_more = true;
					jsdo.autoApplyChanges = false;
					for (var i in data){
						that._updateJsRecord( data[i], options.error );
					}
				}else{
					if ($.isArray(data) && data.length === 1){
						that._updateJsRecord( data[0], options.error );
					}else{
						that._updateJsRecord( data, options.error );
					}
				}
				jsdo.subscribe( 'AfterSaveChanges', function callback ( jsdo, success, request ) {
					jsdo.unsubscribe( 'AfterSaveChanges', callback, jsdo );
					if ( success ) {
						var data = [];
						if (request.fnName == "_submit" && request.jsrecords.length){
							for (var i in request.jsrecords){
								data.push(request.jsrecords[i].data);
							}
						}else{
							if ( request.batch && request.batch.operations instanceof Array && request.batch.operations.length == 1 ) {
								data = request.batch.operations[ 0 ].jsrecord.data;
							}
						}
						that._runresponsecallback( request, data );
						options.success.call( that, data );
					} else {
						options.error.call( that, "", that._runresponsecallback( request, "" ) );
					}
				}, jsdo );
				jsdo.saveChanges(is_more);
			},
			
			_destroy : function ( options ) {
				var that = this;
				// !options?options = that.options:options;
				var jsdo = that.jsdo;
				var is_more = false;
				var data = options.data;
				var find_jsrecords = function(data, error){
					if ( that.settings && typeof that.settings.findById !== "undefined" ) {
						var findById = that.settings.findById;
						jsdo.find( function ( jsrecord ) {
							return ( jsrecord.data[ findById ] == data[ findById ] );
						} );
					} else {
						jsdo.findById( data._id );
					}
					try {
						jsdo.remove();
					} catch ( e ) {
						error( null, null, e );
					}
				};
				if ($.isArray(data) && data.length > 1){
					is_more = true;
					for (var i in data){
						find_jsrecords( data[i], options.error );
					}
				}else{
					if ($.isArray(data) && data.length === 1){
						find_jsrecords( data[0], options.error );
					}else{
						find_jsrecords( data, options.error );
					}
				}
				jsdo.subscribe( 'AfterSaveChanges', function callback ( jsdo, success, request ) {
					jsdo.unsubscribe( 'AfterSaveChanges', callback, jsdo );
					if ( success ) {
						var data = [];
						if (request.fnName == "_submit" && request.jsrecords.length){
							for (var i in request.jsrecords){
								data.push(request.jsrecords[i].data);
							}
						}else{
							if ( request.batch && request.batch.operations instanceof Array && request.batch.operations.length == 1 ) {
								data = request.batch.operations[ 0 ].jsrecord.data;
							}
						}
						options.success( data );
						that._runresponsecallback( request, data );
					} else {
						options.error.call( that, "", that._runresponsecallback( request, "" ) );
					}
				}, jsdo );
				jsdo.saveChanges(is_more);
			},
			
			_updateJsRecord : function ( data, error ) {
				var that = this;
				var jsdo = that.jsdo;
				if ( that.settings && typeof that.settings.findById !== "undefined" ) {
					var findById = that.settings.findById;
					var jsrecord = jsdo.find( function ( jsrecord ) {
						return ( jsrecord.data[ findById ] == data[ findById ] );
					} );
				} else {
					var jsrecord = jsdo.findById( data._id );
				}
				try {
					jsrecord.assign( data ); //
				} catch ( e ) {
					error.call( that, null, e.message, e );
				}
			},

			
			_invoke: function ( options ) {
				var that = this;
				var jsdo = that.jsdo;
				var calbk = function(jsdo, success, request){
					var data;
					if ( success ) {
						var data;
						try {
							data = AfterFill_jsdo.getData();
						} catch ( e ) {
							if ( !data ) {
								data = request.response[request.jsdo._dataSetName ] || (request.response && request.response.dsStatus && request.response.dsStatus.ttStatus);
							}
						}
						that._runresponsecallback( request, data );
						options.success.call( that, data );
					} else {
						options.error.call( that, "", that._runresponsecallback( request, "" ), request.xhr.status, request.exception );
					}
				};
				
				var jsdo_invoker = jsdo.invoke(options.data.name, options.data.data);
				
				if (jsdo_invoker.done){
					jsdo_invoker.done(calbk).fail(function (jsdo, success, request) {
						options.error.call( that, "", that._runresponsecallback( request, "" ) );
			        });
				}else{
					jsdo_invoker.then(function(res_obj){
						calbk(res_obj.jsdo, res_obj.success, res_obj.request);
					}, function (obj) {
						if (obj.info && obj.info.errorObject){
							console.error(obj.info.errorObject.message);
						}
						if (options.error){
							options.error.call( that, "", {status:obj.request.xhr.statusText} );
							//options.error.call( that, "", that._runresponsecallback( obj.request, "" ) );
						}
					});
				}
//				.done(function( jsdo, success, request ) {
//			    	debugger;
//			        var response = request.response;        
//			        var tblOrders = response._retVal;
//			        /* process successful results */
//			     
//
//			    }).fail(function( jsdo, success, request ) {
//			    	debugger;
//			        if (request.response) {
//
//			            var errorMsg = request.response;
//			            /* handle error */
//
//			        }
//			    });
				
//				that._updateJsRecord( options.data, options.error );
//				jsdo.subscribe( 'AfterSaveChanges', function callback ( jsdo, success, request ) {
//					jsdo.unsubscribe( 'AfterSaveChanges', callback, jsdo );
//					var data;
//					if ( success ) {
//						if ( request.batch && request.batch.operations instanceof Array && request.batch.operations.length == 1 ) {
//							data = request.batch.operations[ 0 ].jsrecord.data;
//						}
//						that._runresponsecallback( request, data );
//						options.success.call( that, data );
//					} else {
//						options.error.call( that, "", that._runresponsecallback( request, "" ) );
//					}
//				}, jsdo );
//				jsdo.saveChanges();
			}
			
		} ),

		_JSDO : {
			"setdefault" : {
				serviceURI : window.location.protocol + "//" + document.location.host,
				catalogURI : "",
				resourceName : "",
				ablSessionKey : "ablSessionKey",
				schema : {
					id : '_id'
				},
				authenticationModel : progress.data.Session.AUTH_TYPE_FORM, // FORM
				filter : ""
			},
			callback_login : "",
			sessions : {
				main : ""
			},

			get_catalog_uri : function ( catalogURI, serviceURI ) {
				serviceURI = serviceURI || jsdo._JSDO[ "setdefault" ].serviceURI;
				if ( catalogURI ) {
					if ( catalogURI.indexOf( "/rest/" ) === 0 ) {
						catalogURI = serviceURI + catalogURI;
					} else {
						if ( catalogURI.indexOf( "/static/" ) === 0 ) {
							catalogURI = serviceURI + catalogURI.split( "static/" )[ 0 ];
						}
					}
					return catalogURI;
				} else {
					console.log( "ERROR form get_catalog_uri: Katalog wurde nicht übernommen." );
					return catalogURI;
				}
			},

			create : function ( resourceName, callback, catalogURI ) {
				jsdo._JSDO.getJSDOTransport( resourceName, function () {
				} );

			},

			getJSDOTransport : function ( resourceName, callback, catalogURI, serviceURI ) {
				new jsdo._JSDOTransport( serviceURI, catalogURI, resourceName, function ( jsdo ) {
					callback && callback( jsdo );
				} );
			},

			get_session : function ( serviceURI ) {
				if ( !serviceURI ) {
					return jsdo._JSDO.sessions[ jsdo._JSDO[ "setdefault" ].serviceURI ];
				} else {
					if ( jsdo._JSDO.sessions[ serviceURI ] ) {
						return jsdo._JSDO.sessions[ serviceURI ];
					} else {
						return "";
					}
				}
			},

			addCatalog : function ( CatalogURIs, callback, session ) {
				if ( !session ) {
					// setdefault session
					session = jsdo._JSDO.get_session();
				}
				try {
					if ( session ) {
						CatalogURIs = jsdo._JSDO.get_catalog_uri( CatalogURIs );
							var get_catalog = session.addCatalog( CatalogURIs );
							var error_call = function(){
								var numCats = details.length;
								for ( i = 0; i < numCats; i++ ) {
									if ( details[ i ].result === progress.data.Session.AUTHENTICATION_FAILURE ) {
										console.log( "Authentication error: " + details[ i ].catalogURI );
										jsdo.notauth();
									} else if ( details[ i ].result === progress.data.Session.GENERAL_FAILURE ) {
										console.log( "General Catalog load error: " + details[ i ].catalogURI );
										if ( details[ i ].errorObject ) {
											// Process thrown error object during load . . .
											console.error( details[ i ].errorObject );
											console.log( details[ "0" ].errorObject.message.toString() );
											callback && callback( "", details[ i ].errorObject );
										}
										if ( details[ i ].xhr ) {
											// Process XHR object sent for the load . . .
											console.error( details[ i ].xhr );
											callback && callback( "", details[ i ].xhr );
										}
									} else {
										console.error( "Not sure what is wrong with " + details[ i ].catalogURI );
										console.log( "Not sure what is wrong with " + details[ i ].catalogURI );
									}
								}
							};
							
							if (get_catalog.done){
								get_catalog.done( function ( session, result, details ) {
									console.log( "Catalog " + CatalogURIs + " loaded." );
									callback && callback( session );
								} ).fail( function ( session, result, details ) {
									error_call(session, result, details);
								} );
							}else{
								get_catalog.then( function (then_result) {
									console.log( "Catalog " + CatalogURIs + " loaded." );
									callback && callback( then_result.jsdosession );
								} ).catch( function (catch_err ) {
									error_call(catch_err.session, catch_err.result, catch_err.details);
								} );
							}
					} else {
						callback && callback( 1, "Keine Session" );
					}
				} catch ( errObj ) {
					var msg;
					msg = "\n" + errObj.message;
					console.log( "Unexpected addCatalog() error: " + msg );
					callback && callback( 1, "Unexpected addCatalog() error", msg );
				}
			},

			logout : function ( sess, callback ) {
				var msg = "";
				try {
					sess = sess ? sess : jsdo._JSDO.get_session();
					
					var done_func = function ( session, result, info ) {
//						msg = "Logged out successfully";
						jsdo.notauth();
						$.ajax( {
							async : false,
							cache : false,
							url : "/static/auth/j_spring_security_logout",
							type : "POST",
							data : "",   
							success : function ( result ) {
								callback && callback(result);
							},
							error: function ( err ) {
								callback && callback(err);
							}
						} );
					};
					
					var fail_func = function ( session, result, info ) {
						if (!result){
							session = session.session;
							result = session.result;
							info = session.info;
						}
						if ( result === progress.data.Session.GENERAL_FAILURE ) {
							msg = "Employee Logout failed. Unspecified error";
							if ( info.errorObject ) {
								// Process error object thrown during logout . . .
							}
							if ( info.xhr ) {
								// Process XHR sent during logout . . .
							} else {
								msg = "Unexpected logout result";
								if ( info.errorObject ) {
									// Process error object thrown during logout . . .
								}
								// Process info.xhr, if necessary, for more information
							}
						}
						console.log( msg );
						callback && callback( msg );
					};
					
					
					if (sess.logout().done){
						sess.logout().done( done_func ).fail(fail_func);
					}else{
						sess.logout().then( done_func ).catch(fail_func);
					}
				} catch ( errObj ) {
					msg = errObj ? '\n' + errObj.message : '';
					console.error( "There was an unexpected error attempting log out." + msg );
				}
			},

			login : function ( user_name, pass, sess_name, callback ) {
				// jsdo._JSDO.login(name,pass,url,callback);
				// jsdo._JSDO.login(name,pass,callback);
				var sess, msg, xhr;
				if ( typeof sess_name == "string" ) {
					sess = jsdo._JSDO.sessions[ sess_name ];
				} else {
					sess = jsdo._JSDO.sessions[ jsdo._JSDO[ "setdefault" ].serviceURI ];
					callback = sess_name;
				}
				if ( !sess ) {
					// create new session
					sess = jsdo._JSDO.create_abl_session();
				}
				try {
					var login = function () {
						var sess_login = sess.login( encodeURIComponent( user_name ), encodeURIComponent( pass ) );
						if (sess_login.done){
							sess_login.done( function ( session, result, info ) {
								msg = "Logged in successfully";
								callback && callback( 0, "success", info.errorObject );
							} ).fail( function ( session, result, info ) {
								jsdo._JSDO.rest_error( session, result, info, callback );
								get_msg_error();
							} );
						}else{
							sess_login.then( function ( then_result ) {
								msg = "Logged in successfully";
								callback && callback( 0, "success", then_result.errorObject );
							} ).catch( function ( catch_result ) {
								jsdo._JSDO.rest_error( catch_result.session, catch_result.result, catch_result.info, callback );
								get_msg_error();
							} );
						}
					};
					if ( sess.connected ) {
						jsdo._JSDO.logout( sess, function () {
							login();
						} );
					} else {
						login();
					}

				} catch ( errObj ) {
					msg = "Employee Login failed. Error attempting to call login";
					msg = msg + '\n' + errObj.message;
					console.error( "JSDO " + msg );
					get_msg_error();
				}
				function get_msg_error () {
					console.error( msg + "\nloginResult: " + sess.loginResult + "\nloginHttpStatus: " + sess.loginHttpStatus + "\nuserName: " + sess.userName + "\nLogin XHR: " + xhr );
				}
			},

			rest_error : function ( session, result, info, callback ) {
				var text;
				switch ( result ) {
					case progress.data.Session.LOGIN_AUTHENTICATION_REQUIRED:
						callback && callback( 1, "non-logged in", info.errorObject );
						break;
					case progress.data.Session.AUTHENTICATION_FAILURE:
						text
						// JSDO login failed because of invalid user credentials.
						callback && callback( 1, "JSDO login failed because of invalid user credentials", info.errorObject );
						// showLogin(); // login, then start web app
						break;
					case progress.data.Session.GENERAL_FAILURE:
						// possibly some sort of offline problem
						if ( info.offlineReason ) {
							callback && callback( 1, "possibly some sort of offline problem", info.errorObject );
							console.error( "Offline: " + info.offlineReason );
						} else {
							// JSDO login failed because of a non-authentication failure.
							console.error( "Employee Login failed. Unspecified error" );
							callback && callback( 1, "Employee Login failed. Unspecified error", info.errorObject );

							if ( info.errorObject ) {
								// Process error object thrown during login . . .
							}
							if ( info.xhr ) {
								// Process XHR sent during login . . .
							}

						}
						break;
					default:
						callback && callback( 1, "unknown error", info.errorObject );
						console.error( "check auth error: unknown error: " + info.errorObject );
				}

			},

			get_new_sess : function ( serviceURI, authenticationModel ) {
				return new progress.data.JSDOSession( {
					serviceURI : serviceURI || jsdo._JSDO[ "setdefault" ].serviceURI, // created automatic
					authenticationModel : authenticationModel || jsdo._JSDO[ "setdefault" ].authenticationModel ||  progress.data.Session.AUTH_TYPE_FORM,
					name : jsdo._JSDO[ "setdefault" ].ablSessionKey || "ablSessionKey" // enable page refresh support
				} );
			},

			create_abl_session : function ( serviceURI, sess_name, authenticationModel ) {
				var sess = jsdo._JSDO.get_new_sess( serviceURI, authenticationModel );
				// save sess in ...
				jsdo._JSDO.sessions[ sess_name || jsdo._JSDO[ "setdefault" ].serviceURI ] = sess;
				return sess;
			},

			is_auth : function ( callback, ablSession, serviceURI ) {
				if ( ablSession ) {
					jsdo._JSDO.run_is_auth( ablSession, callback );
				} else {
					var main_sess = jsdo._JSDO.sessions[ jsdo._JSDO[ "setdefault" ].serviceURI ];
					if ( main_sess && !serviceURI ) {
						// check setdefault session
						jsdo._JSDO.run_is_auth( main_sess, callback );
					} else {
						var sess = jsdo._JSDO.sessions[ serviceURI ];
						if ( serviceURI && sess ) {
							jsdo._JSDO.run_is_auth( sess, callback );
						} else {
							var sess = jsdo._JSDO.create_abl_session();
							jsdo._JSDO.is_auth( callback, sess );
						}
					}
				}
			},

			run_is_auth : function ( ablSession, callback ) {
				var isAuthorized = ablSession.isAuthorized();
				if (isAuthorized.done){
					ablSession.isAuthorized().done( function ( session, result, info ) {
						callback && callback( 0, "success", info.errorObject ); // start web app
					}).fail( function ( session, result, info) {
						jsdo._JSDO.rest_error(  session, result, info, callback );
					});
				}else{
					ablSession.isAuthorized().then( function (success_result ) {
						callback && callback( 0, "success", success_result.info.errorObject ); // start web app
					}).catch( function ( result_catch ) {
						jsdo._JSDO.rest_error( result_catch.session, result_catch.result, result_catch.info, callback );
					});
				}
				}
		}
	};

	$( document ).ready( function () {
		$.extend( jsdo, methods );
		window[ "jsdo" ] = jsdo;
		jsdo.isauth = jsdo._JSDO.is_auth;
		jsdo.login = jsdo._JSDO.login;
		jsdo.logout = jsdo._JSDO.logout;
		jsdo.notauth = jsdo.notauth;
	} );

} )( window );
