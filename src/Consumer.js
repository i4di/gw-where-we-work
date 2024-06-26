$(document).ready(function() {
  Consumer.initialize()
});

let Consumer = (function () {
  let $mapContainer,
    resultsMap = undefined;

  let year = 2023;

  let mapData = [];

  let $region,
    region,
    $countryTitle,
    $countryLink;

  let africaCountries,
    asiaCountries,
    middleEasternCountries,
    latinAmericaCountries;

  const STATUS = DataModule.getStatusValues();

  let legendLabels = [
    {label: STATUS.HPC, definition: 'hpc'},
    {label: STATUS.EGP, definition: 'egp'},
  ];

  let initialize = async () => {
    $region = $('.region-div .item');
    $countryTitle = $('.country-title');
    $countryLink = $('.country-link');

    initializeGui();
    initializeEvents();
  };

  let initializeGui = () => {
    $mapContainer = $('#map-container');
  }

  let initializeEvents = () => {
    $region.on('click', event => onClickRegion(event));
    $region[0].click();

    $(document).on('mouseenter', '.country-link', event => onHoverCountryLink(event));
    $(document).on('mouseleave', '.country-link', event => onHoverLeaveCountryLink(event));
  };

  let onHoverCountryLink = (e) => {
    let isoCode = $(e.target).data('iso');

    resultsMap.highlightCountry(isoCode);
    resultsMap.highlight();
  }

  let onHoverLeaveCountryLink = (e) => {
    resultsMap.highlightCountry('');
    resultsMap.lowlight();
  }

  let onClickRegion = async (event) => {
    let $element = $(event.target);
    if (!$element.hasClass('item')) {
      $element = $(event.target).closest('.item');
    }

    $region.find('div').removeClass('active');
    $element.children(":first").toggleClass('active');

    region = $element.children(":first").children(":first").attr('data-region');
    $countryTitle.html(region);

    let countries = [];

    let needToFetchGeojsons = false;

    switch (region) {
      case 'Africa':
        needToFetchGeojsons = !africaCountries;
        countries = needToFetchGeojsons ? [] : africaCountries;
        break;
      case 'Asia':
        needToFetchGeojsons = !asiaCountries;
        countries = needToFetchGeojsons ? [] : asiaCountries;
        break;
      case 'Middle East':
        needToFetchGeojsons = !middleEasternCountries;
        countries = needToFetchGeojsons ? [] : middleEasternCountries;
        break;
      case 'Latin America and the Caribbean':
        needToFetchGeojsons = !latinAmericaCountries;
        countries = needToFetchGeojsons ? [] :   latinAmericaCountries;
        break;
    }

    if (needToFetchGeojsons) {
      let data = DataModule.getCountries2022().filter(d => d.region === region);

      for (let i = 0; i < data.length; i++) {
        let countyMapObject = {
          ...data[i],
          geography: await DataRepository.getCountryGeoJson(data[i].iso3.toLowerCase())
        }
        countries.push(countyMapObject);
      }

      switch (region) {
        case 'Africa':
          africaCountries = countries;
          break;
        case 'Asia':
          asiaCountries = countries;
          break;
        case 'Middle East':
          middleEasternCountries = countries;
          break;
        case 'Latin America and the Caribbean':
          latinAmericaCountries = countries;
          break;
      }
    }

    $('.countries-container').html(renderCountriesByRegion(countries));
    mapData = countries;

    !resultsMap ? initializeMap() : drawMap();
  }

  function initializeMap() {
    let width = WidthHelperModule.getWidthByElementId('map-wrapper');
    let height = WidthHelperModule.getHeightByElementId('map-wrapper');

    resultsMap = scatterMap()
      .width(width)
      .height(height)
      .data(getData())
      // .pointValue(getMapPointValue())
      // .scatterRadius({min: 10, max: 30, na: 5})
      .colorFn(pointColor)
      // .onClickCallback(onDisplayCountryDetails)
      // .popoverContent(countryPopoverContent)
      .legendRendered(true)
      .legendLabels(legendLabels);

    d3.select($mapContainer[0])
      .call(resultsMap);
  }

  let getData = () => {
    return mapData;
  }

  let drawMap = () => {
    let data = getData();

    if (region === 'Middle East') {
      legendLabels.push({label: STATUS.SPC, definition: 'spc'});
    } else {
      legendLabels = legendLabels.filter(function( obj ) {
        return obj.definition !== 'spc';
      });
    }

    resultsMap.data(data);
    resultsMap.legendLabels(legendLabels);

    resultsMap.redraw();
  }

  let pointColor = (country) => {
    switch (country.status) {
      case STATUS.HPC:
        return {
          light: 'rgba(2, 101, 166, 0.4)',
          medium: 'rgba(2, 101, 166, 0.8)',
          dark: '#0265a6'
        };
      case STATUS.SAC:
        return {
          light: 'rgba(237, 145, 33, 0.4)',
          medium: 'rgba(237, 145, 33, 0.8)',
          dark: '#ed9121'
        };
      case STATUS.SPC:
        return {
          light: 'rgba(111, 95, 144, 0.4)',
          medium: 'rgba(111, 95, 144, 0.8)',
          dark: '#6f5f90'
        };
      default:
        return {
          light: 'rgba(112, 153, 117, 0.4)',
          medium: 'rgba(112, 153, 117, 0.8)',
          dark: '#709975'
        };
    }
  }

  let renderCountriesByRegion = (countries) => {
    let html = '';
    countries = countries.sort((a, b) => a.name.localeCompare(b.name))

    for (let i = 0; i < countries.length; i++) {
      if (countries[i].type === 'display') {
        if (countries.length > 20) {
          html += `<div class="country-item"><i class="fas fa-map-marker-alt" style="color: ${pointColor(countries[i]).dark}"></i> <a href="${countries[i].profileUrl ? countries[i].profileUrl : '#'}" target="${countries[i].profileUrl === '#' ? '' : '_blank'}" class="country-link" data-iso="${countries[i].iso3}">${countries[i].name}</a></div>`;
        } else {
          html += `<div style="margin-bottom: 10px;"><i class="fas fa-map-marker-alt" style="color: ${pointColor(countries[i]).dark}"></i> <a href="${countries[i].profileUrl ? countries[i].profileUrl : '#'}" target="${countries[i].profileUrl === '#' ? '' : '_blank'}" class="country-link" data-iso="${countries[i].iso3}">${countries[i].name}</a></div>`;
        }
      }
    }

    return html;
  }

  let randomFunction = () => {
    console.log(test);
  }

  return {
    initialize: initialize
  };

})();