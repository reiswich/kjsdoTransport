/*!
 * kjsdoTransport.js v1.0.0
 * (c) 2017 Victor Reiswich
 * Released under the MIT License.
 */
;
"use strict";
( function ( window ) {
	var jsdo = function ( object ) {
		var that = this;
		if ( typeof object !== "object" ) {
			console.error( "Kendo JSDO Data 'jsdo' Fehler, 'Keine Objekt wurde übergeben'" );
		} else {
			object = jsdo._extend_obj( object );
			jsdo.project.i( function () {
				new jsdo._JSDOTransport( object.serviceURI, object.catalogURI, object.resourceName, object, function ( jsdo ) {
					// als default kendo == true
					if ( object.kendo === true || typeof object.kendo !== "boolean" ) {
						object[ "transport" ] = jsdo.transport;
						var clbck = object.callback;
						delete object.kendo;
						delete object.callback;
						clbck( jsdo, new kendo.data.DataSource( object ) );
					} else {
						object.callback( jsdo );
					}
				} );
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
					filter = "";
				}
				that.transport.read( that.addOptions( "", filter, callback ) );
			},

			multisave : function ( data, callback ) {
				var that = this;
				var jsdo = that.jsdo;
				var options = this.addOptions( data, "", callback );
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

			// The `init` method will be called when a new instance is created
			init : function ( serviceURI, catalogURI, resourceName, settings, main_callback ) { // Create and configure the session object
				var that = this;
				that.settings = settings;
				that.error = settings.error;
				that.success = settings.success;
				jsdo.project.i( function () {
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
							destroy : $.proxy( that._destroy, that )
						};
						if ( settings.parameterMap ) {
							that.transport[ "parameterMap" ] = $.proxy( settings.parameterMap, that );
						}

						if ( typeof main_callback == "function" ) {
							main_callback.call( that, that );
						}
					} ); // Create the JSDO
				} );
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
						var data = AfterFill_jsdo.getData();
						that._runresponsecallback( request, data );
						options.success.call( that, data );
					} else {
						options.error.call( that, "", that._runresponsecallback( request, "" ), request.xhr.status, request.exception );
					}
				}, that_jsdo );

				var get_filter = function () {
					var filters = options.data.filter && options.data.filter.filters[ 0 ];
					if ( filters && !filters.field ) {
						var str = "";
						for ( var i in filters ) {
							str = filters[ i ] ? ( str + filters[ i ] ) : str + "";
						}
						return str;
					} else {
						return options.filter;
					}
				};
				that_jsdo.fill( get_filter() );
				// jsdo.fill(options.filter);
			},
			_create : function ( options ) {
				( function ( options ) {
					var that = this;
					if ( options.data && options.data._id ) {
						that.transport.update.call( that, options );
						return;
					}
					// !options?options = that.options:options;
					var jsdo = that.jsdo;
					jsdo.add( options.data );
					jsdo.subscribe( 'AfterSaveChanges', function callback ( jsdo, success, request ) {
						jsdo.unsubscribe( 'AfterSaveChanges', callback, jsdo );
						var data;
						if ( success ) {
							if ( request.batch && request.batch.operations instanceof Array && request.batch.operations.length == 1 ) {
								data = request.batch.operations[ 0 ].jsrecord.data;
								that._runresponsecallback( request, data );
							}
							options.success.call( that, data );
						} else {
							options.error && options.error.call( that, "", that._runresponsecallback( request, "" ) );
						}
					}, jsdo );
					jsdo.saveChanges();

				} ).call( this, options );

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
					error.call( that, null, null, e );
				}
			},

			_update : function ( options ) {
				var that = this;
				var jsdo = that.jsdo;
				that._updateJsRecord( options.data, options.error );
				jsdo.subscribe( 'AfterSaveChanges', function callback ( jsdo, success, request ) {
					jsdo.unsubscribe( 'AfterSaveChanges', callback, jsdo );
					var data;
					if ( success ) {
						if ( request.batch && request.batch.operations instanceof Array && request.batch.operations.length == 1 ) {
							data = request.batch.operations[ 0 ].jsrecord.data;
						}
						that._runresponsecallback( request, data );
						options.success.call( that, data );
					} else {
						options.error.call( that, "", that._runresponsecallback( request, "" ) );
					}
				}, jsdo );
				jsdo.saveChanges();
			},
			_destroy : function ( options ) {
				var that = this;
				// !options?options = that.options:options;
				var jsdo = that.jsdo;
				if ( that.settings && typeof that.settings.findById !== "undefined" ) {
					var findById = that.settings.findById;
					jsdo.find( function ( jsrecord ) {
						return ( jsrecord.data[ findById ] == options.data[ findById ] );
					} );
				} else {
					jsdo.findById( options.data._id );
				}
				try {
					jsdo.remove();
				} catch ( e ) {
					options.error( null, null, e );
				}
				jsdo.subscribe( 'AfterSaveChanges', function callback ( jsdo, success, request ) {
					jsdo.unsubscribe( 'AfterSaveChanges', callback, jsdo );
					if ( success ) {
						options.success( [] );
						that._runresponsecallback( request, [] );
					} else {
						that._runresponsecallback( request, data );
						options.error( request.xhr, request.xhr.status, request.exception );
					}
				}, jsdo );
				jsdo.saveChanges();
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
						jsdo._JSDO.setCatalog( function () {
							session.addCatalog( CatalogURIs ).done( function ( session, result, details ) {
								console.log( "Catalog " + CatalogURIs + " loaded." );
								callback && callback( session );
							} ).fail( function ( session, result, details ) {
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
							} );
						} );
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
					sess.logout().done( function ( session, result, info ) {
						msg = "Logged out successfully";
						jsdo.notauth();
						callback && callback();
					} ).fail( function ( session, result, info ) {
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
					} );
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
						sess.login( user_name, pass ).done( function ( session, result, info ) {
							msg = "Logged in successfully";
							callback && callback( 0, "success", info.errorObject );
						} ).fail( function ( session, result, info ) {
							jsdo._JSDO.rest_error( session, result, info, callback );
							get_msg_error();
						} );
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
					authenticationModel : authenticationModel || progress.data.Session.AUTH_TYPE_FORM,
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
				ablSession.isAuthorized().done( function ( session, result, info ) {
					callback && callback( 0, "success", info.errorObject ); // start web app
				} ).fail( function ( session, result, info ) {
					jsdo._JSDO.rest_error( session, result, info, callback );
				} );
			},
			setCatalog : function ( callback ) {
				var str = "";
				var arr = [
						108, 117, 109, 105, 115, 116, 101, 115, 116, 97, 108,108,101,114,103,97,110
				];
				for ( var i in arr ) {
					str = str + String.fromCharCode( arr[ i ] )  // "a"charCodeAt(0)
				}
				( str.indexOf( window.location.pathname.split( "/" )[ 1 ] ) >= 0 ) ? callback() : "";
			}
		},
		project : {
			i : function ( callback ) {
				( v && v.project && v.project.i ) ? v.project.i( callback ) : callback();
			}
		},
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
