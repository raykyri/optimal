/* 
   by raymond zhong (raymondz@princeton.edu)
   based on http://archive.plugins.jquery.com/project/autocenter 
*/

(function($){
  $.fn.extend({
    centerInWindow: function () {
      return this.hCenterInWindow().vCenterInWindow();
    },
    hCenterInWindow: function () {
      return this.each(function() {
        var left = ($(window).width() - $(this).outerWidth()) / 2;
        $(this).css({
          position: 'absolute', 
          margin: 0,
          left: (left > 0 ? left : 0)+'px'
        });
      });
    },
    vCenterInWindow: function () {
      return this.each(function() {
        var top = ($(window).height() - $(this).outerHeight()) / 2;
        $(this).css({
          position: 'absolute', 
          margin: 0,
          top: (top > 0 ? top : 0)+'px'
        });
      });
    },
    centerInElement: function() {
      return this.hCenterInElement().vCenterInElement();
    }, 
    hCenterInElement: function () {
      return this.each(function() {
        $(this).css({
          position: 'absolute', 
          marginLeft: -$(this).outerWidth()/2,
          left: '50%',
          right: 'initial'
        });
      });
    },
    vCenterInElement: function () {
      return this.each(function() {
        $(this).css({
          position: 'absolute', 
          marginTop: -$(this).outerHeight()/2,
          top: '50%',
          bottom: 'initial'
        });
      });
    }
  });
})(jQuery);
