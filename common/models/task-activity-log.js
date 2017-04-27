'use strict';

module.exports = function(Taskactivitylog) {
	
  Taskactivitylog.observe('before save', function updateTimestamp(ctx, next) {
	  
  if(ctx.isNewInstance) {
    ctx.instance.createdDate = new Date();	
  } 
  next();
});	

};
