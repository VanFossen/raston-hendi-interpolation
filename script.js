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
    values.temperature == "13.5" ||
    values.temperature == "16" ||
    values.temperature == "18" ||
    values.temperature == "20"
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
      console.log("    temperature is between 13.5 and 16");
      temp1 = 16;
      temp2 = 18;
    } else if (values.temperature > 18 && values.temperature < 20) {
      console.log("    temperature is between 13.5 and 16");
      temp1 = 18;
      temp2 = 20;
    }

    const dataObject = await fetchDataFile(values.url, temp1, temp2);
    interpolateValue(dataObject, values, temp1, temp2);

    // let d1 = dataObject.data1.split("\n").map((elem)=>elem.trim().split("\t"))
    // console.log({d1})
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

function interpolateValue(dataObject, values, temp1, temp2) {
  /**
   * File Starts             File Ends
   * 13.5K --> 2038.4001     13.5K --> 2086.6305
   *   16K --> 2030.2477       16K --> 2089.5735
   *   18K --> 2035.384        18K --> 2086.6448
   *   20K --> 2040.3401       20K --> 2087.6247
   */
  let fileXStart;
  switch (temp1) {
    case 13.5:
      fileXStart = 2038.4001;
      break;
    case 16:
      fileXStart = 2030.2477;
      break;
    case 18:
      fileXStart = 2035.384;
      break;
    case 20:
      fileXStart = 2040.3401;
      break;
    default:
      console.log("ERROR");
  }

  let fileYStart;
  switch (temp2) {
    case 13.5:
      fileYStart = 2038.4001;
      break;
    case 16:
      fileYStart = 2030.2477;
      break;
    case 18:
      fileYStart = 2035.384;
      break;
    case 20:
      fileYStart = 2040.3401;
      break;
    default:
      console.log("ERROR");
  }

  let d1 = new Map(
    dataObject.data1.split("\n").map((elem) => elem.trim().split("\t"))
  );

  let d2 = new Map(
    dataObject.data2.split("\n").map((elem) => elem.trim().split("\t"))
  );

  console.log("");

  let fileStart;
  // compare X starting value to Y starting value
  if (fileXStart > fileYStart) {
    // if X is larger, make Y start where X does
    fileStart = fileXStart;
    console.log("  d1 is larger");
  } else if (fileXStart < fileYStart) {
    // if Y is larger, make X start where Y does
    fileStart = fileYStart;
    console.log("  d2 is larger");
  }

  // compare min to the starting value of d1/d2
  if (values.min_lambda < fileXStart && values.min_lambda < fileYStart) {
    //  if min is smaller than d1/d2, make min d1/d2
    values.min_lambda = fileStart;
    console.log("    change min");
  } else {
    //  if d1/d2 is smaller than min, make d1/d2 start at min
    console.log("    start at min");
  }

  // calculate values for interpolation
  const deltaT = temp2 - temp1;
  const normalizeTr = values.temperature - temp1;
  const scalingFactor = normalizeTr / deltaT;

  console.log("");

  let d1Value, d2Value;
  for (let i = fileStart; i < fileStart + 0.002; i += 0.0001) {
    console.log(i + "   type:" + typeof i);
    // d1Value = d1.get(i);
    // d2Value = d2.get(i);
    // console.log(d1Value + (d2Value - d1Value) * scalingFactor);
  }
}
