define( [ "qlik",
'text!./template.ng.html',
'./definition',
'text!./dialog-template.ng.html',
'css!./MasterScript.css',
'util',
'enigma',
'autogenerated/qix/engine-api'
],
function ( qlik, template, definition, dialogTemplate, cssStyle, Util, enigma, schema) {
	'use strict';
	return {
		support : {
			snapshot: false,
			export: false,
			exportData : false
		},
		template: template,
		definition: definition,
		paint: function ($element,layout){

			layout.navmode = qlik.navigation.getMode();
			console.log($element);

			if(layout.navmode == 'analysis'){
				$("#launchButton").removeClass("hidden").addClass("hidden");
			}else{
				$("#launchButton").removeClass("hidden");
			}

		},
		controller: ['$scope','luiDialog', function ( $scope, luiDialog) {


			console.log($scope);

			$scope.processButton = function($event){

				$scope.openWizard();
			};


			/* This function opens the dialog window when the openWizard() function
			is called */
			$scope.openWizard = function(){
				luiDialog.show({
					template: dialogTemplate,
					input: {
						selectedKey: '',
						wizardName: '',
						showKey: false,
						wizardList: $scope.wizardList,
						appModel: $scope.component.model.app,
						layout: $scope.layout,
						isLoading: false,
						enableVizBuild: true,
						previewEnabled: false,
						buttonState: 0,
						buttonTitle: 'Preview Master Items',
						buttonIcon: 'view',
						warningMessage: '',
						masterScriptListInternal: []
					},
					controller: ['$scope', function( $scope ) {
						console.log($scope);

						/* Get current Qlik App and field list */
						var app = qlik.currApp(this);



						/* Set the default tab and create the function which will allow for
						the tab to be changed in code */
						$scope.tabs = 'tab1';
						$scope.make_tab_active = function(tabid) {
							$scope.tabs = 'tab'+tabid;
							//console.log($scope.tabs);
						}

						//$scope.make_tab_active(1);


						$scope.updateDimList = function(){
							var list = {
								qInfo: {
	        				qId: "",
	        				qType: "DimensionList"
	      				},
	      				qDimensionListDef: {
									qType: 'dimension',
	        				qData: {grouping: '/qDim/qGrouping'}
	      				}
							};

							$scope.input.appModel.createSessionObject(list).then((data) => {
								$scope.input.dimListObj = data;
								$scope.refreshDimList(data);
							});
						};

						$scope.refreshDimList = function(dimListObj){
							dimListObj.getLayout().then((dataLayout) => {
								//console.log("Refresh Dim List");
								//console.log(dataLayout);
								$scope.input.dimList = dataLayout.qDimensionList.qItems;
								$scope.processItems();

							});
						};

						$scope.updateMesList = function(){
							var list = {
								qInfo: {
	        				qId: "",
	        				qType: "MeasureList"
	      				},
	      				qMeasureListDef: {
									qType: 'measure',
	        				qData: {grouping: '/qMeasure/qGrouping'}
	      				}
							};

							$scope.input.appModel.createSessionObject(list).then((data) => {
								$scope.input.mesListObj = data;
								$scope.refreshMesList(data);
							});
						};

						$scope.refreshMesList = function(mesListObj){
							mesListObj.getLayout().then((dataLayout) => {
								//console.log("Refresh Dim List");
								//console.log(dataLayout);
								$scope.input.mesList = dataLayout.qMeasureList.qItems;
								$scope.processItems();
							});
						};

						$scope.updateDimList();
						$scope.updateMesList();

						//console.log("Session Object");
						//console.log($scope.input.DimListObj);

						$scope.input.masterScriptList = app.createTable([
							"_MasterItemID",
							"_MasterItemType",
							"_MasterItemName",
							"_MasterItemDescription",
							"_MasterItemColor",
							"_MasterItemTags",
							"_MasterItemExpression1",
							"_MasterItemExpression2",
							"_MasterItemExpression3",
							"_MasterItemExpression4",
							"_MasterItemExpression5"]
						, [],{rows:200});

						var listener = function() {
							$scope.processItems();
		 				};
		 				$scope.input.masterScriptList.OnData.bind( listener ); //bind the listener



						$scope.process = function(){
							//console.log("Process Click");

							$scope.createItems(true);

						};

						$scope.createItems = function(shouldCreate){
							var p = [];
							$scope.input.masterScriptListInternal.forEach(function(row) {
    						//console.log(row);

								if(row.rowType == "Dimension"){
									var a = $scope.createDimension(row, shouldCreate);
									p.push(a);
								}
								if(row.rowType == "Measure"){
									var a = $scope.createMeasure(row, shouldCreate);
									//console.log(a);
									p.push(a);
								}
							});

							Promise.all(p).then(values => {
								$scope.refreshDimList($scope.input.dimListObj);
								$scope.refreshMesList($scope.input.mesListObj);

							});

						};

						$scope.processItems = function(){

							var table = $scope.input.masterScriptList;

							var iDCol = table.getColByName('_MasterItemID');
							var typeCol = table.getColByName('_MasterItemType');
							var nameCol = table.getColByName('_MasterItemName');
							var descCol = table.getColByName('_MasterItemDescription');
							var colorCol = table.getColByName('_MasterItemColor');
							var tagCol = table.getColByName('_MasterItemTags');

							$scope.input.masterScriptList.rows.forEach(function(row, rowNum) {
    						//console.log(row);

								var fieldsList = [];

								for(var i = 1; i <= 10; i++)
								{
									var expCol = table.getColByName('_MasterItemExpression'+i);
									var cell = row.cells[expCol];
									if(cell && cell.qElemNumber >= 0){
										fieldsList.push(cell.qText);
									}
								}

								var tagsList = row.cells[tagCol].qText.split(";");
								tagsList.push(row.cells[iDCol].qText);

								var rowDisplay = row.cells[typeCol].qText;
								if(fieldsList.length > 1 && rowDisplay == "Dimension"){
									rowDisplay = "Drill-down Dimension"
								}
								var prevProcessed = 'P';
								if(typeof $scope.input.masterScriptListInternal[rowNum] != 'undefined'){
									prevProcessed = $scope.input.masterScriptListInternal[rowNum].processed;
								}

								var itemData = {
									rowNumber:rowNum,
									rowType: row.cells[typeCol].qText,
									rowDisplayType: rowDisplay,
									displayName: row.cells[nameCol].qText,
									description: row.cells[descCol].qText,
									color: row.cells[colorCol].qText,
									fields: fieldsList,
									tags: tagsList,
									msId: row.cells[iDCol].qText,
									status: "Pending",
									processed: prevProcessed
								};

								$scope.input.masterScriptListInternal[rowNum] = itemData;
								$scope.checkDim(itemData);
								$scope.checkMes(itemData);

							});

							//console.log("Complete");
							//console.log($scope.input.masterScriptListInternal);

						};

						$scope.checkDim = function(t){
							var check = false;
							$scope.input.dimList.forEach(function(dim){
								//console.log(dim);

								if(t.msId == dim.qMeta.masterScriptId){
									console.log("Dim Already Exists: " + t.msId + " " + dim.qMeta.masterScriptId);
									t.qId = dim.qInfo.qId;
									check = true;
									//console.log(t);
								}
							});
							if(t.rowType == "Dimension"){
								if(check){
									t.status = "Exists";
								}else{
									t.status = "Not Created";
								}
							}
							return check;
						};

						$scope.checkMes = function(t){
							var check = false;
							$scope.input.mesList.forEach(function(mes){
								//console.log(dim);

								if(t.msId == mes.qMeta.masterScriptId){
									console.log("Measure Already Exists: " + t.msId + " " + mes.qMeta.masterScriptId);
									t.qId = mes.qInfo.qId;
									check = true;
								}
							});
							if(t.rowType == "Measure"){
								if(check){
									t.status = "Exists";
								}else{
									t.status = "Not Created";
								}
							}

							return check;
						};


						/* Create Dimension */
						$scope.createDimension = function(t, shouldCreate){
							var group = "N";
							if(t.fields.length > 1) group = "H";

							var colorBlock = {}

							if(t.color != "-"){
								colorBlock = {
									baseColor: {
										color: t.color,
										index: -1
									}
								};
							}
							var dimJSON =
							{
								qInfo: {
									qType: "dimension"
								},
								qDim: {
									qGrouping: group,
									qFieldDefs: t.fields,
									qFieldLabels: t.fields,
									title:t.displayName,
									coloring: colorBlock
								},
								qMetaDef: {
									title:t.displayName,
									description:t.description,
									tags:t.tags,
									masterScriptId:t.msId
								}
							};

							if($scope.checkDim(t)){
								if(shouldCreate){
									return $scope.input.appModel.getDimension(t.qId).then((data) => {
										data.setProperties(dimJSON);
										t.processed = "U";
									 });
								}
							}else{
								if(shouldCreate){
									return $scope.input.appModel.createDimension(dimJSON).then((data) => {
										t.processed = "C";
									});
								}
							}
						};

						/* Create Measure */
						$scope.createMeasure = function(t, shouldCreate){
							var mesJSON =
							{
								qInfo: {
									qType: "measure"
								},
								qMeasure: {
									qLabel:t.displayName,
									qGrouping: "N",
									qDef: t.fields[0],
									qExpressions:[],
									qActiveExpression: 0,
									coloring: {
										baseColor: {
											color: t.color,
											index: -1
										}
									}
								},
								qMetaDef: {
									title:t.displayName,
									description:t.description,
									tags:t.tags,
									masterScriptId:t.msId
								}
							};

							if($scope.checkMes(t)){
								console.log("Updating: "+ t.qId);
								return $scope.input.appModel.getMeasure(t.qId).then((data) => {
									console.log("Updating Measure");
									console.log(data);
									data.setProperties(mesJSON);
									t.processed = "U";
								 });
							}else{
								if(shouldCreate){
									return $scope.input.appModel.createMeasure(mesJSON).then((data) => {
										t.processed = "C";
									});
								}
							}
						};

					}]
				});
			}
		}]
	};
});
