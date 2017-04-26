'use strict';

module.exports = function(Taskoutputs) {
	
Taskoutputs.observe('after save', function(ctx, next) {
  console.log('Taskoutputs Save called!!!');
  if (ctx.instance) {
    console.log('Taskoutputs Save called %s#%s', ctx.Model.modelName, ctx.instance.id);
  } else {
    console.log('Updated %s matching %j',
      ctx.Model.pluralModelName,
      ctx.where);
  }
  next();
});
	

};
