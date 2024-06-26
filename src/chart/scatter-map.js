function scatterMap() {
  let id;

  let width = 400,
      height = 400;

  let svg,
      canvas;

  let tileLayer,
      zoomControl,
      basemap,
      path,
      transform,
      map;

  let initialZoomLevel,
      zoomPosition = 'bottomright';
  
  let mapType = 'map';

  let popoverCallback = undefined;
  const POPOVER_FIELD_ID = 'iso3';
  
  let minHeatmapColor = '#a2c0e4',
      maxHeatmapColor = '#002f6c',
      heatColorScale;
  
  let scatterRadius = {min: 10, max: 50, na: 5},
      scatterRadiusScale;
  
  let colorFn = () => '#002f6c';

  let data,
    pointKey = (point) => point.iso3,
    pointValue = (point) => point.value,
    pointGeography = (point) => point.geography.features[0];
  
  let minDataValue = undefined,
      maxDataValue = undefined;

  let highlightCountry;

  let onClickCallback = (country) => console.log(country),
      popoverContent = (country) => undefined;
  
  let legendLabels = [],
      legendRendered = true;

  function chart(selection) {
    selection.each(function () {
      id = $(this).attr('id');
      $(this).width(width);
      $(this).height(height);

      render();
      reset();

      initialZoomLevel = basemap.getZoom();
    });
  }

  //#region Map rendering

  function render() {
    initializeScatterScales();
    renderBasemap();
    renderMap();
    renderLegend();
  }

  function renderBasemap() {
    tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 8,
      minZoom: 1,
      noWrap: true
    });

    let basemapData = {
      'type': 'FeatureCollection',
      'features': data.filter((point) => pointGeography(point) !== null).map((point) => pointGeography(point))
    };

    basemap = L.map(id, {zoomControl: false, zoomSnap: 0.1, attributionControl: false}).fitBounds(L.geoJson(basemapData).getBounds());
    basemap.on('zoomend', reset);

    zoomControl = L.control.zoom({position: zoomPosition});

    svg = d3.select(basemap.getPanes().overlayPane).append('svg');
    canvas = svg.append('g')
      .attr('class', 'leaflet-zoom-hide');

    transform = d3.geoTransform({point: projectPoint});
    path = d3.geoPath().projection(transform);

    zoomControl.addTo(basemap);
    // tileLayer.addTo(basemap);
  }

  function renderMap() {
    switch (mapType) {
      case 'map':
        renderCountries();
        break;
      case 'scatter':
        renderScatter();
        break;
      case 'heat':
        renderHeat();
        break;
    }
  }
  
  function renderCountries() {
    let mapData = data.filter((point) => pointGeography(point) !== null);

    map = canvas.append('g')
      .attr('class', 'map')
      .selectAll('path')
      .data(mapData)
      .enter()
      .append('path')
      .attr('d', (d) => path(pointGeography(d)))
      .attr('class', (d) => d.iso3.toLowerCase())
      .attr('fill', (d) => {
        if (d.status === 'High Priority Country') {
          return '#0265a6';
        }

        if (d.status === 'Expanded Global Portfolio') {
          return '#709975';
        }

        if (d.status === 'Strategic Priority Country') {
          return '#6f5f90';
        }

        if (d.status === 'Other') {
          return '#fff';
        }

        return '#000';
      })
      .attr('stroke', (d) => {
        if (highlightCountry === d.iso3) {
          return '#ba0d2f';
        }

        return '#c3c3c3';
      })
      .attr('stroke-width', (d) => {
        if (highlightCountry === d.iso3) {
          return 2;
        }

        return 1;
      })
      .style('pointer-events', 'auto')
      .on('mouseover', function(_, d) {
        if (d.status !== 'Other') {
          // showPopover(d);

          let thisClass = d3.select(this).attr("class");
          d3.selectAll("path").attr("opacity", 0.5);
          d3.selectAll("." + thisClass).attr("opacity", 1);

          $(`.country-link[data-iso='${d.iso3}']`).addClass('highlight');
        }
      })
      .on('mouseout', function(_, d) {
        // hidePopover(d);
        d3.selectAll("path").attr("opacity", 1);

        $(`.country-link[data-iso='${d.iso3}']`).removeClass('highlight');
      })
      .on('click', (_, d) => {
        $('.popover').popover('hide');

        if (d.status !== 'Other') {
          showPopover(d);
        }
        // onClickCallback(d);
      });

    // Clear old renders, if any
    canvas.selectAll('g.rect').remove();

    canvas.append('g')
      .attr('class', 'rect')
      .selectAll('rect')
      .data(mapData)
      .enter()
      .append('rect')
      .attr('x', (d) => path.centroid(pointGeography(d))[0])
      .attr('y', (d) => path.centroid(pointGeography(d))[1])
      .attr('width', 1)
      .attr('height', 1)
      .attr('stroke', 'transparent')
      .attr('fill', 'transparent')
      .attr('stroke-width', 1)
      .attr('data-animation', false)
      .attr('data-trigger', 'hover')
      .attr('data-container', 'body')
      .attr('data-toggle', 'popover')
      .attr('data-placement', 'top')
      .attr('data-content', function(d) {
        let flagClass = d.iso3.toLowerCase();

        let tooltipContent = `<div class="mb-2 flag ${flagClass}"></div>`;
        tooltipContent += `<div class="mb-2 text-center"><strong>${d.name}</strong></div>`;

        if (d.status) {
          tooltipContent += `<div class="row">
                          <div class="col-lg-12 col-md-12 col-sm-12">
                            <div class="ml-2 status-label">
                              <strong>${d.status}</strong>
                            </div>`;

          if (d.profileUrl !== '#') {
            tooltipContent += `<div class="d-flex justify-content-center align-items-center status-label">
                                <a href="${d.profileUrl}" target="_blank">View Country Profile</a>
                               </div>`;
          }

          tooltipContent += `</div>
                         </div>`;
        }
        return tooltipContent;
      })
      .attr('data-html', true)
      .attr('data-id', function(d) {
        return d[POPOVER_FIELD_ID];
      });
  }
  
  function renderScatter() {
    let mapData = data.filter((point) => pointGeography(point) !== null);

    map = canvas.append('g')
      .attr('class', 'map')
      .selectAll('path')
      .data(mapData)
      .enter()
      .append('path')
      .attr('d', (d) => path(pointGeography(d)))
      .attr('class', (d) => d.iso3.toLowerCase())
      .attr('fill', (d) => colorFn(d).light)
      .attr('stroke', () => {
        return '#ffffff';
      })
      .attr('stroke-width', 1)
      .on('click', (_, d) => {
        $('.popover').popover('hide');
        onClickCallback(d);
      })
      .style('pointer-events', 'auto');
    
    canvas.append('g')
      .attr('class', 'circle')
      .attr('width', width)
      .attr('height', height)
      .selectAll('circle')
      .data(mapData)
      .enter()
      .append('circle')
      .attr('class', (d) => pointKey(d))
      .attr('cx', (d) => path.centroid(pointGeography(d))[0])
      .attr('cy', (d) => path.centroid(pointGeography(d))[1])
      .attr('r', (d) => getScatterRadius(d))
      .attr('fill', (d) => {
        let value = pointValue(d);
        if (value === 0 || value === null) {
          return 'none';
        }
        return colorFn(d).medium
      })
      .attr('stroke-width', 2)
      .attr('stroke', (d) => {
        let value = pointValue(d);
        if (value === 0 || value === null) {
          return 'none'; 
        }
        return colorFn(d).dark
      })
      .attr('data-id', (d) => pointKey(d))
      .attr('data-animation', false)
      .attr('data-container', 'body')
      .attr('data-toggle', 'popover')
      .attr('data-placement', 'top')
      .attr('data-html', true)
      .attr('data-content', (d) => {
        return popoverContent(d);
      })
      .on('click', (_, d) => {
        $('.popover').popover('hide');
        onClickCallback(d);
      })
      .on('mouseenter', (_, d) => showPopover(d))
      .on('mouseout', (_, d) => hidePopover(d));
  }
  
  function renderHeat() {
    let mapData = data.filter((point) => pointGeography(point) !== null);
    heatColorScale = getHeatColorScale();
    
    map = canvas.append('g')
      .attr('class', 'map')
      .selectAll('path')
      .data(mapData)
      .enter()
      .append('path')
      .attr('d', (d) => path(pointGeography(d)))
      .attr('class', (d) => d.iso3.toLowerCase())
      .attr('fill', (d) => {
        let heatMapValue = pointValue(d);
        
        if (heatMapValue === 0 || heatMapValue === null) {
          return '#fbf8f3';
        }

        return heatColorScale(pointValue(d));
      })
      .attr('stroke', (d) => {
        let heatMapValue = pointValue(d);

        if (heatMapValue === 0 || heatMapValue === null) {
          return '#ecdada';
        }

        return '#ffffff';
      })
      .attr('stroke-width', 1)
      .style('pointer-events', 'auto')
      .on('click', (_, d) => {
        $('.popover').popover('hide');
        onClickCallback(d);
      })
      .on('mouseenter', (_, d) => showPopover(d))
      .on('mouseout', (_, d) => hidePopover(d));

    canvas.append('g')
      .attr('class', 'circle')
      .selectAll('circle')
      .data(mapData)
      .enter()
      .append('circle')
      .attr('class', (d) => d.iso3)
      .attr('cx', (d) => path.centroid(pointGeography(d))[0])
      .attr('cy', (d) => path.centroid(pointGeography(d))[1])
      .attr('r', 5)
      .attr('fill', 'none')
      .attr('data-id', (d) => pointKey(d))
      .attr('data-animation', false)
      .attr('data-container', 'body')
      .attr('data-toggle', 'popover')
      .attr('data-placement', 'top')
      .attr('data-html', true)
      .attr('data-content', (d) => {
        return popoverContent(d);
      });
  }
  
  function renderLegend() {
    let $legendContainer = $('#legend-container');
    $legendContainer.empty();
    
    if (!legendRendered) {
      return; 
    }
    
    if (!legendLabels || legendLabels.length === 0) {
      return;
    }
    
    let legendHtml = `<ul class="chart-widget-legend m-0">`;
    for (let i = 0; i < legendLabels.length; ++i) {
      let legendLabel = legendLabels[i];
      let legendLabelColor = colorFn({status: legendLabel.label}).dark;
      
      // legendHtml += `<li class="font-size-sm mt-0 ${legendLabel.definition !== null ? 'indicator-definition': ''}" style="opacity: 1; transition: all 0.15s ease-in-out 0s;" data-indicator="indicator-definition-${legendLabel.definition}"><div class="color-code" style="background-color: ${legendLabelColor}"></div>${legendLabel.label}</li>`
      legendHtml += `<li class="font-size-sm mt-0" style="opacity: 1; transition: all 0.15s ease-in-out 0s;"><div class="color-code" style="background-color: ${legendLabelColor}"></div>${legendLabel.label}</li>`

    }
    legendHtml += `</ul>`;
    
    $(`#legend-container`).append(legendHtml);
  }

  function reset() {
    if (!initialZoomLevel) {
      initialZoomLevel = basemap.getZoom();
    }

    let basemapData = {
      'type': 'FeatureCollection',
      'features': data.filter((point) => pointGeography(point) !== null).map((point) => pointGeography(point))
    };

    let currentZoomLevel = basemap.getZoom();
    let scaleFactor = currentZoomLevel / initialZoomLevel;
    let bounds = path.bounds(basemapData);

    let topLeft = bounds[0];
    let bottomRight = bounds[1];

    svg.attr('width', bottomRight[0] - topLeft[0])
      .attr('height', bottomRight[1] - topLeft[1])
      .style('left', `${topLeft[0]}px`)
      .style('top', `${topLeft[1]}px`);

    svg.selectAll('g.map').attr('transform', `translate(${-topLeft[0]}, ${-topLeft[1]})`);
    svg.selectAll('g.text').attr('transform', `translate(${-topLeft[0]}, ${-topLeft[1]})`);
    svg.selectAll('g.circle').attr('transform', `translate(${-topLeft[0]}, ${-topLeft[1]})`);
    svg.selectAll('g.rect').attr('transform', `translate(${-topLeft[0]}, ${-topLeft[1]})`);

    // Adjust the labels positions on zoom event, too
    canvas.selectAll('text')
      .attr('x', (d) => path.centroid(pointGeography(d))[0])
      .attr('y', (d) => path.centroid(pointGeography(d))[1]);

    canvas.selectAll('circle')
      .attr('cx', (d) => path.centroid(pointGeography(d))[0])
      .attr('cy', (d) => path.centroid(pointGeography(d))[1])
      .attr('r', (d) => getScatterRadius(d));

    canvas.selectAll('rect')
      .attr('x', (d) => path.centroid(pointGeography(d))[0])
      .attr('y', (d) => path.centroid(pointGeography(d))[1])
      .attr('width', 1)
      .attr('height', 1);

    map.enter()
      .append('path')
      .merge(map)
      .attr('d', (d) => {
        return path(pointGeography(d));
      });
  }

  //#endregion

  //#region Events
  function showPopover(d) {
    let popoverId = d[POPOVER_FIELD_ID];
    $('#' + id + ' [data-id="' + popoverId + '"]').popover('show');
  }

  function hidePopover(d) {
    let popoverId = d[POPOVER_FIELD_ID];
    $('#' + id + ' [data-id="' + popoverId + '"]').popover('hide');
  }
  //#endregion

  //#region Helpers

  function projectPoint(x, y) {
    let point = basemap.latLngToLayerPoint(new L.LatLng(y, x));

    this.stream.point(point.x, point.y);
  }

  function initializeScatterScales() {
    minDataValue = DataHelper.getMinValue(data, pointValue);
    maxDataValue = DataHelper.getMaxValue(data, pointValue);

    scatterRadiusScale = d3.scaleLinear()
      .domain([minDataValue, maxDataValue])
      .range([scatterRadius.min, scatterRadius.max]);
  }
  
  function getScatterRadius(country) {
    let value = pointValue(country);
    if (value === 0 || value === null) {
      return scatterRadius.na;
    }
    
    return scatterRadiusScale(value);
  }

  function getHeatColorScale() {
    let mapData = data.filter((point) => pointGeography(point) !== null);
    
    let minValue = DataHelper.getMinValue(mapData, pointValue);
    let maxValue = DataHelper.getMaxValue(mapData, pointValue);

    return d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([colorFn(data[0]).light, colorFn(data[0]).dark]);
  }

  //#endregion

  //#region API

  chart.width = function (value) {
    if (!arguments.length) {
      return width;
    }
    width = value;

    return chart;
  };

  chart.height = function (value) {
    if (!arguments.length) {
      return height;
    }
    height = value;

    return chart;
  };

  chart.data = function (value) {
    if (!arguments.length) {
      return data;
    }
    data = value;

    return chart;
  };
  
  chart.pointKey = function (value) {
    if (!arguments.length) {
      return pointKey;
    }
    pointKey = value;
    
    return chart;
  };
  
  chart.pointValue = function (value) {
    if (!arguments.length) {
      return pointValue;
    }
    pointValue = value;
    
    return chart;
  };
  
  chart.pointGeography = function (value) {
    if (!arguments.length) {
      return pointGeography;
    }
    pointGeography = value;
    
    return chart;
  };
  
  chart.scatterRadius = function (value) {
    if (!arguments.length) {
      return scatterRadius;
    }
    scatterRadius = value;
    
    return chart;
  };
  
  chart.colorFn = function (value) {
    if (!arguments.length) {
      return colorFn;
    }
    colorFn = value;
    
    return chart;
  };
  
  chart.onClickCallback = function (value) {
    if (!arguments.length) {
      return onClickCallback;
    }
    onClickCallback = value;
    
    return chart;
  };
  
  chart.popoverContent = function (value) {
    if (!arguments.length) {
      return popoverContent;
    }
    popoverContent = value;
    
    return chart;
  };
  
  chart.legendLabels = function (value) {
    if (!arguments.length) {
      return legendLabels;
    }
    legendLabels = value;
    
    return chart;
  };
  
  chart.legendRendered = function (value) {
    if (!arguments.length) {
      return legendRendered;
    }
    legendRendered = value;
    
    return chart;
  };
  
  chart.mapType = function (value) {
    if (!arguments.length) {
      return mapType;
    }
    mapType = value;
    
    return chart;
  };

  chart.highlightCountry = function (value) {
    if (!arguments.length) {
      return highlightCountry;
    }
    highlightCountry = value;

    return chart;
  };

  chart.highlight = function () {
    map.attr('opacity', (d) => {
      if (highlightCountry === d.iso3) {
        showPopover(d);
        return 1;
      }

      return 0.5;
    });
  }

  chart.lowlight = function () {
    map.attr('opacity', (d) => {
      hidePopover(d);
      return 1;
    });
  }

  chart.redraw = function () {
    let $this = $(`#${id}`);

    // Reset the basemap reference; otherwise Leaflet will not allow re-render of the map
    // that has already been initialized before
    basemap.off();
    basemap.remove();

    $this.empty();

    $this.width(width);
    $this.height(height);

    svg = d3.select(`#${id}`)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    canvas = svg.append('g')
      .attr('class', 'leaflet-zoom-hide');

    initializeScatterScales();
    renderBasemap();
    renderMap();
    renderLegend();
    reset();
    initialZoomLevel = basemap.getZoom();
  };

  //#endregion

  return chart;
}