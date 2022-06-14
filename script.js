// when "Calculate Spectrum" is pressed, fetch proper .dat file or interpolate
document.getElementById("interpolation").onclick = async function () {
  console.log("*** interpolation starting ***");

  const props = {
    temperature: 14, // default 13.5
    min_lambda: 2030, // default 2030
    max_lambda: 2090, // default 2090
    url: "https://raw.githubusercontent.com/RastonLab/Virtual-HeNDI-Spectrometer/main/interpolator/spectra/OCS_",
  };

  console.log("  provied parameters");
  console.log("    - temperature: " + props.temperature);
  console.log("    - min_lambda: " + props.min_lambda);
  console.log("    - provied parameters: " + props.max_lambda);

  // The four .dat files: 13.5, 16, 18, 20
  // use matching .dat file if the requested temperature matches
  if (
    props.temperature == "13.5" ||
    props.temperature == "16" ||
    props.temperature == "18" ||
    props.temperature == "20"
  ) {
    console.log("  number matches existing .dat");
    console.log("    temperature: " + props.temperature);

    const dataObject = await fetchDataFile(props.url, props.temperature);
    // TODO --> Send file to graph

    // interpolate .dat file if the requested temperature does not match
  } else {
    console.log("  number does not match existing .dat");
    console.log("  determine which dat files the number is between");
    let temp1 = null;
    let temp2 = null;

    // determine what two temperatures are above and below the requested temperature
    if (props.temperature > 13.5 && props.temperature < 16) {
      console.log("    temperature is between 13.5 and 16");
      temp1 = 13.5;
      temp2 = 16;
    } else if (props.temperature > 16 && props.temperature < 18) {
      console.log("    temperature is between 13.5 and 16");
      temp1 = 16;
      temp2 = 18;
    } else if (props.temperature > 18 && props.temperature < 20) {
      console.log("    temperature is between 13.5 and 16");
      temp1 = 18;
      temp2 = 20;
    }

    const dataObject = await fetchDataFile(props.url, temp1, temp2);
    interpolateValue(dataObject);

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
  console.log(response1);

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
    console.log(response2);

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

function interpolateValue(dataObject) {
  let d1, d2;

  d1 = dataObject.data1.split("\n").map((elem) => elem.trim().split("\t"));
  console.log({ d1 });

  d2 = dataObject.data2.split("\n").map((elem) => elem.trim().split("\t"));
  console.log({ d2 });

}
