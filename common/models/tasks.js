var app = require('../../server/server');
'use strict';

module.exports = function(Tasks) {

var re = /^[a-zA-Z0-9]*$/;
Tasks.validatesInclusionOf('statusId', {'in':[1,2,3,4]});
Tasks.validatesFormatOf('taskCode', {with: re});
Tasks.validatesInclusionOf('sequenceType', {'in':['Sequential','Parallel']});
Tasks.validatesNumericalityOf('sequenceNumber', {int: true});

Tasks.observe('before save', function updateTimestamp(ctx, next) {
	  console.log('> before save triggered:', ctx.Model.modelName, ctx.instance ||
      ctx.data);

	var data = ctx.instance || ctx.data;  
	if(ctx.isNewInstance) {
		console.log('new instance setting created date');
		ctx.instance.createdDate = new Date();
	} else {
		console.log('validate status');
		
		Tasks.findOne({where: {taskCode:data.taskCode}}, function(err, task) {
			if (err) return next(err);
			
			var statusRules = app.models.status_rules;
			var currentStatusVal = task.statusId;
			var nextStatusVal = data.statusId;
			console.log('status value is %s status', currentStatusVal);
			statusRules.find({where: {current_status:currentStatusVal}, fields:{next_status:true}}, function (err, data) {
				if (err) return next(err);
				console.log('found some next statuses %s', data.length);
				if(data != undefined && data.length >= 1) {
					var statusValid = false;
					for (var i=0; i< data.length; i++) {
						console.log('next status val:%s', data[i].next_status);
						if (nextStatusVal == data[i].next_status) {
							console.log('matching valid next status is found');	
							statusValid = true;
							break;
						}
					}
					if (!statusValid) {
						console.log('status is invalid returning');
						//next('Specified Status transition is not allowed');
						//return;
					}
				} else {
					console.log('status is invalid returning');
				}
			});
			
		});

	}
	data.lastModificationDate = new Date();	
	
  
  next();
});

Tasks.observe('after save', function(ctx, next) {
  if (ctx.instance) {
    console.log('Saved %s#%s', ctx.Model.modelName, ctx.instance.id);	
	if (ctx.instance.statusId >= 3) {	
		console.log('Managing sequence enforcement now');
		var currentSeqNum = ctx.instance.sequenceNumber;
		console.log('Currently completed/canceled task sequenceNumber is:%s', currentSeqNum);
		console.log('Now finding all tasks with sequenceNumber >= %s and work item id %s in seqNumber asc order', currentSeqNum, ctx.instance.workItemId);
		Tasks.find({where: {and:[{workItemId:ctx.instance.workItemId},{sequenceNumber:{gte:ctx.instance.sequenceNumber}}]}, order: 'sequenceNumber ASC'}, function(err, data){
				if (err) return next(err);
				console.log('found tasks without error');
				if (data.length >= 1) {
					console.log('found one or more such tasks');
					var seqNum;
					for (var index = 0; index < data.length; index++) {
					
						if (data[index].sequenceNumber == currentSeqNum) {
							console.log('this task is parallel to currently completed/cancelled task');
							if (data[index].statusId < 3) {
								console.log('there is still a parallel task to be completed, hence exiting without updating status of any task');
								break;
							}
						} else {
							console.log('looking for next task to be updated');
							if (seqNum == undefined || data[index].sequenceNumber == seqNum) {
								seqNum = data[index].sequenceNumber;								
								console.log('about to update the next task status %s', data[index].id);
								data[index].statusId = 1;
								Tasks.upsertWithWhere({"taskCode": data[index].id}, data[index], function(err, updatedTask) {
									console.log('updated task status is:%s',updatedTask.statusId );
								});
							} else {
								console.log('Tasks next in sequence are updated with appropriate status');
								break;
							}
						}							
					}
				}				
		});		
	}
	
	if(ctx.isNewInstance && ctx.instance.workItemId != undefined) {
		console.log("creating the parent work item relation");
		var relation = {"related_item_type":"parent","related_item_code":ctx.instance.workItemId,"taskCode":ctx.instance.taskCode};
		Tasks.app.models.task_relations.create(relation, function(err, data) {
						if (err) return next(err);						
							console.log('Relations has been created %s', data);									
					});
	}
  } else {
    console.log('Updated %s matching %j',
      ctx.Model.pluralModelName,
      ctx.where);
  }
  
  next();
});

Tasks.saveAll = function(task, cb) {
	var outputs;
	var relations;
	if(task != undefined) {
		if(task.outputs != undefined) {
			outputs = task.outputs;
		}
		if(task.relations != undefined) {
			relations = task.relations;
		}

		Tasks.create(task, function(err, instance) {
			if (err) {
				console.error(err);
				cb(err);
			} else {
				console.log('Task has been created %s', instance.taskCode);			
				if (outputs != undefined)	{
					Tasks.app.models.task_outputs.create(outputs, function(err, data) {
						if (err) {
							console.error(err);
							cb(err);
						} else {
							console.log('Output has been created %s', data.output_key);			
						}
					});
				}
				if (relations != undefined)	{
					Tasks.app.models.task_relations.create(relations, function(err, data) {
						if (err) {
							console.error(err);
							cb(err);
						} else {
							console.log('Relations has been created %s', data);			
						}
					});
				}
				cb(null, instance);
			}
		});
	}      
}

Tasks.remoteMethod('saveAll', {
	  accepts: {arg: 'task', type: 'object', http: { source: 'body' }},
	  http: {verb: 'post'},
	  returns: {arg: 'task', type: 'object'}
});


};
