/*
  jQuery Version:			jQuery 1.3.2+
  Plugin Name:				aToolTip 1.5 (patched to remove visibility control)
  Plugin by: 				Ara Abcarians: http://ara-abcarians.com
  License:				Creative Commons Attribution 3.0 Unported
  */

(function($) {
  $.fn.aToolTip = function(options) {
    var defaults = {
      // required
      tipContent: '',
      // do not override
      closeTipBtn: 'aToolTipCloseBtn',
      toolTipId: 'aToolTip',
      // ok to override
      fixed: false,
      clickIt: false,
      toolTipClass: 'defaultTheme',
      xOffset: 5,
      yOffset: 5
    },
    // This makes it so the users custom options overrides the default ones
    settings = $.extend({}, defaults, options);
    
    return this.each(function() {
      var obj = $(this);
      var tipContent = settings.tipContent;
      
      /**
	 Build the markup for aToolTip
      */
      var buildaToolTip = function(){
        var content;
        if (typeof tipContent === 'function') {
          content = tipContent();
        } else {
          content = tipContent;
        }
	$('body').append("<div id='"+settings.toolTipId+"' class='"+settings.toolTipClass+"'><p class='aToolTipContent'>"+content+"</p></div>");
	
	if(tipContent && settings.clickIt){
	  $('#'+settings.toolTipId+' p.aToolTipContent')
	    .append("<a id='"+settings.closeTipBtn+"' href='#' alt='close'>close</a>");
	}
      },

      /**
	 Position aToolTip
      */
      positionaToolTip = function(){
	$('#'+settings.toolTipId).css({
	  top: (obj.offset().top - $('#'+settings.toolTipId).outerHeight() - settings.yOffset) + 'px',
	  left: (obj.offset().left + obj.outerWidth() + settings.xOffset) + 'px'
	});
      },
      /**
	 Remove aToolTip
      */
      removeaToolTip = function(){
	// Fade out
	$('#'+settings.toolTipId).stop().fadeOut(settings.outSpeed, function(){
	  $(this).remove();
	});				
      };
      
      /**
	 Decide what kind of tooltips to display
      */
      // Regular aToolTip
      if(tipContent && !settings.clickIt){	
	// Activate on hover	
	obj.hover(function(){
	  // remove already existing tooltip
	  $('#'+settings.toolTipId).remove();
	  obj.attr({title: ''});
	  buildaToolTip();
	  positionaToolTip();
	}, function(){ 
	  removeaToolTip();
	});	
      } 		    
      
      // Click activated aToolTip
      if(tipContent && settings.clickIt){
	// Activate on click	
	obj.click(function(el){
	  // remove already existing tooltip
	  $('#'+settings.toolTipId).remove();
	  obj.attr({title: ''});
	  buildaToolTip();
	  positionaToolTip();
	  // Click to close tooltip
	  $('#'+settings.closeTipBtn).click(function(){
	    removeaToolTip();
	    return false;
	  });		 
	  return false;			
	});
      }
      
      // Follow mouse if enabled
      if(!settings.fixed && !settings.clickIt){
	obj.mousemove(function(el){
	  $('#'+settings.toolTipId).css({
	    top: (el.pageY - $('#'+settings.toolTipId).outerHeight() - settings.yOffset),
	    left: (el.pageX + settings.xOffset)
	  });
	});			
      }		    
      
    }); // END: return this
  };
})(jQuery);