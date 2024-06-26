let DataHelper = (function () {
  function getMinValue(data, valueFunction) {
    if (!valueFunction || !data || data.length === 0) {
      return undefined;
    }

    let min = Number.POSITIVE_INFINITY;
    for (let point of data) {
      let value = valueFunction(point);
      if (value === null || value === undefined) {
        continue;
      }
      if (value < min) {
        min = value;
      }
    }
    return min;
  }

  function getMaxValue(data, valueFunction) {
    if (!valueFunction || !data || data.length === 0) {
      return undefined;
    }

    let max = Number.NEGATIVE_INFINITY;
    for (let point of data) {
      let value = valueFunction(point);
      if (value === null || value === undefined) {
        continue;
      }
      if (value > max) {
        max = value;
      }
    }
    return max;
  }
  
  function formatNumber(value, prefix = '', suffix = '') {
    if (!value) {
      return '-';
    }
    return prefix + (value).toLocaleString('en') + suffix;
  }
  
  function filterBy(data, predicate) {
    if (!predicate || !data || data.length === 0) {
      return undefined;
    }
    
    return data.filter((point) => predicate(point));
  }
  
  function countBy(data, predicate) {
    if (!predicate || !data || data.length === 0) {
      return 0;
    }
    
    return data.filter((point) => predicate(point)).length;
  }
  
  function sum(data, valueFn) {
    if (!valueFn || !data || data.length === 0) {
      return 0;
    }
    
    let sum = 0;
    for (let i = 0; i < data.length; ++i) {
      let point = data[i];
      let pointValue = valueFn(point);
      
      sum += pointValue;
    }
    
    return sum;
  }
  
  return {
    getMinValue: getMinValue,
    getMaxValue: getMaxValue,
    formatNumber: formatNumber,
    filterBy: filterBy,
    countBy: countBy,
    sum: sum
  }
})();