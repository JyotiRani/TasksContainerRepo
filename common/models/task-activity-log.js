'use strict';

module.exports = function(Taskactivitylog) {
	
  Taskactivitylog.observe('before save', function updateTimestamp(ctx, next) {
	  console.log('> before save triggered:', ctx.Model.modelName, ctx.instance ||
      ctx.data);
  if (ctx.instance) {
    ctx.instance.createdDate = new Date();	
  } else {
    ctx.data.createdDate = new Date();	
  }
  next();
});	

};
