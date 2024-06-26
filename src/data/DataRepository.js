let DataRepository = (function () {

  let getJson = async (path) => {
    return fetch(path)
      .then(response => response.json())
      .catch(error => undefined);
  };

  let getCountryGeoJson = async (iso) => {
    iso = iso.toUpperCase();
    let path = `geojson/all/${iso}.geojson`;

    return getJson(path)
  }

  return {
    getCountryGeoJson: getCountryGeoJson
  };

})();