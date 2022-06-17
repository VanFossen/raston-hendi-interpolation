// find the largest Big()
Big.max = function () {
  var i,
    y,
    x = new this(arguments[0]);
  for (i = 1; i < arguments.length; i++) {
    y = new this(arguments[i]);
    if (x.lt(y)) x = y;
  }
  return x;
};

// find the smallest Big()
Big.min = function () {
  var i,
    y,
    x = new this(arguments[0]);
  for (i = 1; i < arguments.length; i++) {
    y = new this(arguments[i]);
    if (x.gt(y)) x = y;
  }
  return x;
};

// when "Calculate Spectrum" is pressed, fetch proper .dat file or interpolate
document.getElementById("interpolation").onclick = async function () {
  const values = {
    temperature: 14, // default 13.5
    min_lambda: 2030, // default 2030
    max_lambda: 2090, // default 2090
    url: "https://raw.githubusercontent.com/RastonLab/Virtual-HeNDI-Spectrometer/main/interpolator/spectra/OCS_",
  };

  console.log("  provied parameters");
  console.log("    - temperature: " + values.temperature);
  console.log("    - min_lambda: " + values.min_lambda);
  console.log("    - max_lambda: " + values.max_lambda);

  // The four .dat files: 13.5, 16, 18, 20
  // use matching .dat file if the requested temperature matches
  if (
    values.temperature === 13.5 ||
    values.temperature === 16 ||
    values.temperature === 18 ||
    values.temperature === 20
  ) {
    console.log("  number matches existing .dat");
    console.log("    temperature: " + values.temperature);

    const dataObject = await fetchDataFile(values.url, values.temperature);
    // TODO --> Send file to graph

    // interpolate .dat file if the requested temperature does not match
  } else {
    console.log("  number does not match existing .dat");
    console.log("  determine which dat files the number is between");
    let temp1 = null;
    let temp2 = null;

    // determine what two temperatures are above and below the requested temperature
    if (values.temperature > 13.5 && values.temperature < 16) {
      console.log("    temperature is between 13.5 and 16");
      temp1 = 13.5;
      temp2 = 16;
    } else if (values.temperature > 16 && values.temperature < 18) {
      console.log("    temperature is between 16 and 18");
      temp1 = 16;
      temp2 = 18;
    } else if (values.temperature > 18 && values.temperature < 20) {
      console.log("    temperature is between 18 and 20");
      temp1 = 18;
      temp2 = 20;
    }

    const dataObject = await fetchDataFile(values.url, temp1, temp2);

    console.log(new Date());
    const interpolatedSpectrum = interpolateValue(
      dataObject,
      values,
      temp1,
      temp2
    );
    console.log(new Date());

    console.log(interpolatedSpectrum);

    return interpolatedSpectrum;
  }
};

// constructs URLs for the .dat files. Performs fetch request to obtain the .dat files.
// https://www.topcoder.com/thrive/articles/fetch-api-javascript-how-to-make-get-and-post-requests
// https://www.javascripttutorial.net/javascript-fetch-api/
async function fetchDataFile(baseURL, temp1, temp2) {
  let url1, url2;
  let response1, response2;
  let data1, data2;

  // construct and fetch the first .dat file
  url1 = baseURL.concat(temp1, "K.dat");
  response1 = await fetch(url1);

  if (response1.status === 200)
    console.log("  response is good! Response: " + response1.status);

  data1 = await response1.text();
  dataObject = {
    data1,
  };
  if (temp2) {
    // construct and fetch the second .dat file (if needed)
    url2 = baseURL.concat(temp2, "K.dat");
    response2 = await fetch(url2);

    if (response2.status === 200) {
      console.log("  response is good! Response: " + response2.status);
    }
    data2 = await response2.text();
    dataObject = {
      ...dataObject,
      data2,
    };
  }
  return dataObject;
}

function fileBounds(temp) {
  /**
   * File Starts             File Ends
   * 13.5K --> 2038.4001     13.5K --> 2086.6305
   *   16K --> 2030.2477       16K --> 2089.5735
   *   18K --> 2035.384        18K --> 2086.6448
   *   20K --> 2040.3401       20K --> 2087.6247
   */
  switch (temp) {
    case 13.5:
      return {
        start: new Big("2038.4001"),
        end: new Big("2086.6305"),
      };
    case 16:
      return {
        start: new Big("2030.2477"),
        end: new Big("2089.5735"),
      };
    case 18:
      return {
        start: new Big("2035.384"),
        end: new Big("2086.6448"),
      };
    case 20:
      return {
        start: new Big("2040.3401"),
        end: new Big("2087.6247"),
      };
  }
  throw `no data for given temp: ${temp}`;
}

function interpolateValue(dataObject, values, fileXTemp, fileYTemp) {
  // determine the start and end of fileX and fileY
  let fileXBounds = fileBounds(fileXTemp);
  let fileYBounds = fileBounds(fileYTemp);

  let d1 = new Map(
    dataObject.data1.split("\n").map((elem) => elem.trim().split("\t"))
  );

  let d2 = new Map(
    dataObject.data2.split("\n").map((elem) => elem.trim().split("\t"))
  );

  // the fileStart will be the largest of the two
  let fileStart = Big.max(fileXBounds.start, fileYBounds.start);

  // the fileEnd will be the smallest of the two
  let fileEnd = Big.min(fileXBounds.end, fileYBounds.end);

  // if the requested min is less than fileStart, make the requested min the same as fileStart
  if (
    new Big(values.min_lambda) < fileXBounds.start &&
    new Big(values.min_lambda) < fileYBounds.start
  ) {
    //  if min is smaller than d1/d2, make min d1/d2
    values.min_lambda = fileStart;
    // console.log("    change min");
  } else {
    //  if d1/d2 is smaller than min, make d1/d2 start at min ( for debugging, useless in actual implementaiton)
    // console.log("    start at min");
  }

  const bigTemp1 = new Big(fileXTemp);
  const bigTemp2 = new Big(fileYTemp);
  const bigTemperature = new Big(values.temperature);

  // calculate values for interpolation
  const deltaT = new Big(bigTemp2.minus(bigTemp1));
  const normalizeTr = new Big(bigTemperature.minus(bigTemp1));
  const scalingFactor = new Big(normalizeTr.div(deltaT));

  let finalSpectrum = "";
  for (let i = fileStart; i < fileEnd; i = i.add(0.0001)) {
    // console.log(i + " " + d1.get(i.toString()) + " " + d2.get(i.toString()));

    d1Value = new Big(d1.get(i.toString()));
    d2Value = new Big(d2.get(i.toString()));

    // d1 + (d2 - d1) * scale
    let answer = new Big(
      d1Value.add(d2Value.minus(d1Value).times(scalingFactor))
    );

    finalSpectrum += i + "\t" + answer + "\n";
  }

  return finalSpectrum;
}
