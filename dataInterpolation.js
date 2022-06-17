/**
 * Primary function that facilitates data file retrieval and interpolation (if interpolation is needed)
 * @param {number} temperature The requested nozzle temperature
 * @param {number} min_lambda  The requested minimum wavenumber
 * @param {number} max_lambda The requested maximum wavenumber
 * @returns A retrieved or interpolated data that Dygraph can present to the user
 */
async function calculateSpectrum(
  temperature = 13.5,
  min_lambda = 2030,
  max_lambda = 2090
) {
  const url =
    "https://raw.githubusercontent.com/RastonLab/Virtual-HeNDI-Spectrometer/main/interpolator/spectra/OCS_";

  console.log("provied parameters");
  console.log("  - temperature: " + temperature);
  console.log("  - min_lambda: " + min_lambda);
  console.log("  - max_lambda: " + max_lambda);

  // use existing .dat file if the requested temperature matches
  if (
    temperature === 13.5 ||
    temperature === 16 ||
    temperature === 18 ||
    temperature === 20
  ) {
    console.log("  number matches existing .dat");

    const dataObject = await fetchDataFile(url, temperature);

    console.log("DONE");
    return dataObject.fileXData;

    // interpolate .dat file if the requested temperature does not match
  } else {
    console.log(
      "number does not match existing .dat --> determine which files the number is between"
    );

    // determine what two temperatures are above and below the requested temperature
    let fileXTemp, fileYTemp;
    if (temperature > 13.5 && temperature < 16) {
      console.log("    temperature is between 13.5 and 16");
      fileXTemp = 13.5;
      fileYTemp = 16;
    } else if (temperature > 16 && temperature < 18) {
      console.log("    temperature is between 16 and 18");
      fileXTemp = 16;
      fileYTemp = 18;
    } else if (temperature > 18 && temperature < 20) {
      console.log("    temperature is between 18 and 20");
      fileXTemp = 18;
      fileYTemp = 20;
    }

    const dataObject = await fetchDataFile(url, fileXTemp, fileYTemp);

    console.log(new Date());
    const interpolatedSpectrum = interpolateValue(
      dataObject,
      min_lambda,
      temperature,
      fileXTemp,
      fileYTemp
    );
    console.log(new Date());
    console.log(interpolatedSpectrum);
    console.log("  DONE");
    return interpolatedSpectrum;
  }
}

/**
 * Performs a fetch request to retrieve data from the needed file(s). If two files are needed both will be retrieved.
 * https://www.topcoder.com/thrive/articles/fetch-api-javascript-how-to-make-get-and-post-requests
 * https://www.javascripttutorial.net/javascript-fetch-api/
 * @param {string} baseURL
 * @param {number} fileXTemp
 * @param {number} fileYTemp
 * @returns An object that contains the data from the fetched file(s)
 */
async function fetchDataFile(baseURL, fileXTemp, fileYTemp) {
  const fileXUrl = baseURL.concat(fileXTemp, "K.dat");
  const fileXResponse = await fetch(fileXUrl);

  if (fileXResponse.status === 200) {
    console.log("  response is good! Response: " + fileXResponse.status);
  } else {
    throw new Error(`fetch request failed: ${fileXResponse.status}.`);
  }

  const fileXData = await fileXResponse.text();
  let dataObject = {
    fileXData,
  };

  if (fileYTemp) {
    // construct and fetch the second .dat file (if needed)
    const fileYUrl = baseURL.concat(fileYTemp, "K.dat");
    const fileYResponse = await fetch(fileYUrl);

    if (fileYResponse.status === 200) {
      console.log("  response is good! Response: " + fileYResponse.status);
    }
    const fileYData = await fileYResponse.text();
    dataObject = {
      ...dataObject,
      fileYData,
    };
  }
  return dataObject;
}

/**
 * Provided a temperature associated with a data file, determines the start and end point of that file.
 * @param {number} temperature TODO
 * @returns An object that contains the start and end X value of a data file. The start and end values are Big()
 */
function fileBounds(temperature) {
  /**
   * File Starts             File Ends
   * 13.5K --> 2038.4001     13.5K --> 2086.6305
   *   16K --> 2030.2477       16K --> 2089.5735
   *   18K --> 2035.384        18K --> 2086.6448
   *   20K --> 2040.3401       20K --> 2087.6247
   */
  switch (temperature) {
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
    default:
      throw new Error(
        `No data exists for the given temperature: ${temperature}`
      );
  }
}

/**
 * Performs the interpolation math between two provided data files
 * @param {object} dataObject An object that contains the data from the fetched files
 * @param {number} min_lambda The requested minimum wavenumber
 * @param {number} temperature The requested nozzle temperature
 * @param {number} fileXTemp The temperature associated with file X
 * @param {number} fileYTemp The temperature associated with file X
 * @returns Data that Dygraph can present to the user
 */
function interpolateValue(
  dataObject,
  min_lambda,
  temperature,
  fileXTemp,
  fileYTemp
) {
  // determine the start and end of fileX and fileY
  let fileXBounds = fileBounds(fileXTemp);
  let fileYBounds = fileBounds(fileYTemp);

  let d1 = new Map(
    dataObject.fileXData.split("\n").map((elem) => elem.trim().split("\t"))
  );

  let d2 = new Map(
    dataObject.fileYData.split("\n").map((elem) => elem.trim().split("\t"))
  );

  // the fileStart will be the largest of the two
  const fileStart = Big.max(fileXBounds.start, fileYBounds.start);

  // the fileEnd will be the smallest of the two
  const fileEnd = Big.min(fileXBounds.end, fileYBounds.end);

  // if the requested min is less than fileStart, make the requested min the same as fileStart
  if (
    new Big(min_lambda) < fileXBounds.start &&
    new Big(min_lambda) < fileYBounds.start
  ) {
    //  if min is smaller than d1/d2, make min d1/d2
    min_lambda = fileStart;
    console.log("    change min");
  } else {
    //  if d1/d2 is smaller than min, make d1/d2 start at min ( for debugging, useless in actual implementaiton)
    console.log("    start at min");
  }

  const bigTemp1 = new Big(fileXTemp);
  const bigTemp2 = new Big(fileYTemp);
  const bigTemperature = new Big(temperature);

  // deltaT = Tb - Ta
  const deltaT = new Big(bigTemp2.minus(bigTemp1));
  // normalizeTr = Tr - Ta
  const normalizeTr = new Big(bigTemperature.minus(bigTemp1));
  // scalingFactor = normalizeTr / deltaT
  const scalingFactor = new Big(normalizeTr.div(deltaT));

  let finalSpectrum = "";
  let d1Value, d2Value;
  console.log("  file start: " + fileStart + "   fileEnd: " + fileEnd);
  for (let i = fileStart; i <= fileEnd; i = i.add(0.0001)) {
    // console.log(i + " " + d1.get(i.toString()) + " " + d2.get(i.toString()));
    // console.log(i + " " + d1.has(i.toString()) + " " + d2.has(i.toString()));

    // if an x (i) value is missing, skip
    if (!d1.has(i.toString()) || !d2.has(i.toString())) {
      continue;
    }

    d1Value = new Big(d1.get(i.toString()));
    d2Value = new Big(d2.get(i.toString()));

    let answer = new Big(
      // d1 + (d2 - d1) * scale
      d1Value.add(d2Value.minus(d1Value).times(scalingFactor))
    );

    finalSpectrum += i + "\t" + answer + "\r\n";
  }
  return finalSpectrum;
}

/**
 * find the largest Big() number
 * @returns the larger number
 */
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

/**
 * find the smallest Big() number
 * @returns the smaller number
 */
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
