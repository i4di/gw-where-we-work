let WidthHelperModule = (function() {

    let getWidthByClasses = function(classes, leftPadding, rightPadding) {
        let html = '<div class="' + classes + '"><svg style="width: 100%;"></svg></div>';
        let $html = $(html);

        $('body').append($html);
        let width = $html.find('svg').width();

        $html.remove();

        return width - leftPadding - rightPadding;
    };
    
    let getWidthByElementId = function(elementId) {
        let $element = $(`#${elementId}`);
        
        return $element.width();
    };

    let getHeightByElementId = function(elementId) {
        let $element = $(`#${elementId}`);

        return $element.height();
    };

    return {
        getWidthByClasses: getWidthByClasses,
        getWidthByElementId: getWidthByElementId,
        getHeightByElementId: getHeightByElementId
    }

})();