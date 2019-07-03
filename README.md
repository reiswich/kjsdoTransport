### kjsdoTransport - library is based on JSDO library for Progress Data Object Services - https://github.com/progress/JSDO


# Live Demo

1) Without Kendo Ui Datasource - http://danevi.de/main/grid_jsdo_transport.html

2) With Kendo Ui Datasource    - http://danevi.de/main/grid_KendoUIDataSource.html


### Examples

#### Integrate into HTML page

```html
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>
// The JSDO plus the Kendo UI DataSource for JSDO minified for deployment
<script src="https://raw.githubusercontent.com/progress/JSDO/master/lib/progress.all.min.js"></script>
<script src="kjsdoTransport.js"></script>
```


#### javascript code

```javascript

 var serviceURI = "https://oemobiledemo.progress.com/OEMobileDemoServices";
var catalogURI = "https://oemobiledemo.progress.com/OEMobileDemoServices/static/SportsService.json";
 jsdo.setdefault({
	serviceURI : serviceURI,
	ablSessionKey : "ablSessionKey",
	authenticationModel: "anonymous" // default   progress.data.Session.AUTH_TYPE_FORM
 });


jsdo.login( user_name, pass, callback ( err, msg ))
jsdo.logout( session, callback);


// Event, if not authenticated
jsdo.notauth = function(){
	// Run Pop-Up 
	alert( "authentication required" );
};


// isAuthorized
// Determines if the current JSDOSession object has authorized access to the web application specified by its serviceURI property setting.
jsdo.isauth( function ( status, error_info ) {
	if ( status ) {
		l.session.login_js.open();
	} else {
		that.logged = true;
		l.session.login_js.get_userName.call( that );
		}
});

// ********************* Without Kendo Ui Datasource *********************

// Init Customer
var init_Customer = function(callback){
  jsdo({
	catalogURI : catalogURI,
	resourceName : "Customer",
	kendo: false,  // for DataSource Kendo UI, default false
	callback : function(jsdo_customer){
		      // JSDO "Customer" Object
		      callback(jsdo_customer);
	}
  });
}


init_Customer(function(jsdo_customer){

  // Read Customer
  jsdo_customer.read(function(data_customer){
    .........
  });
  
  // Create Customer
  jsdo_customer.create({... JSON ....} or [{...}, {...}, {...} ...], function(data_customer){
     .........
  });
  
  // Update Customer
  jsdo_customer.update({... JSON ....} or [{...}, {...}, {...} ...], function(data_customer){
     .........
  });
  
  // if JSON with _id, then update, else create
  jsdo_customer.save({... JSON ....} or [{...}, {...}, {...} ...], function(data_customer){
      .........
  });
  
   // Destroy Customer  
   jsdo_customer.destroy({... JSON ....} or [{...}, {...}, {...} ...], function(data, error){
      .........
   });
});




// ********************* With Kendo Ui Datasource  *********************

// Init JSDO wthi Kendo Ui Datasource
var init_jsdo_customer = function(callback){
				jsdo( {
			         //   serviceURI : serviceURI,
			            catalogURI : catalogURI,
			            resourceName : resourceName,
			            kendo: true,  // for DataSource, default false
			            DataSource: {
			                serverPaging: false,
			                serverFiltering: true,
			                serverSorting: false,
			                pageSize: 20,
			                schema: {
			                    model: {
			                        fields: {
			                           CustNum: { type: "integer", editable: false, },
			                           Country: { type: "string"},
			                           Name: { type: "string" },
			                           Address: { type: "string"},
			                           City: { type: "string" },
			                           State: { type: "string" },
			                           Contact: { type: "string" },
			                           Phone: { type: "string" }
			                        }
			                        }
			                    }
			            },
			            callback : callback
			            });
				};
init_jsdo_customer(function(jsdo_transport,  DataSource){
					  $("#grid").kendoGrid({
			                    dataSource: DataSource,
			                    filterable: true,
			                    sortable: {
			                        mode: "single",
			                        allowUnsort: false
			                    },
			                    pageable: true,
			                    height: 550,
			                    toolbar: ["create", "save", "cancel"],
			                    columns: [
			                        { field:"Country",title:"Country" },
			                        { field: "Name", title: "Name" },
			                        { field: "State", title: "State" },
			                        { field: "PostalCode", title: "PostalCode" },
			                        { field: "City", title:"City"},
			                        { command: "destroy", title: " ", width: "150px" }],
			                    editable: true
			                });
					});

```
