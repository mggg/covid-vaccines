mapboxgl.accessToken =
  "pk.eyJ1IjoiZGlzdHJpY3RyIiwiYSI6ImNqbjUzMTE5ZTBmcXgzcG81ZHBwMnFsOXYifQ.8HRRLKHEJA0AismGk2SX2g";

// polyfills
if (!String.prototype.includes) {
  String.prototype.includes = function (search, start) {
    "use strict";

    if (search instanceof RegExp) {
      throw TypeError("first argument must not be a RegExp");
    }
    if (start === undefined) {
      start = 0;
    }
    return this.indexOf(search, start) !== -1;
  };
}
// prettier-ignore
Array.prototype.includes||Object.defineProperty(Array.prototype,"includes",{value:function(r,e){if(null==this)throw new TypeError('"this" is null or not defined');var t=Object(this),n=t.length>>>0;if(0===n)return!1;var i,o,a=0|e,u=Math.max(0<=a?a:n-Math.abs(a),0);for(;u<n;){if((i=t[u])===(o=r)||"number"==typeof i&&"number"==typeof o&&isNaN(i)&&isNaN(o))return!0;u++}return!1}});

var main_map = null;
var select_state = "ma";

var state_configs = {
  ma: {
    center: [-71.5, 42.12],
    zoom: 7,
    colleges: "./geojson/ma_universities_with_aicum.geojson?v=5",
    name: "Massachusetts",
  },
};

var $util = $(".util").on("change", function () {
  if (this.value !== "0") {
    $util.not(this).get(0).selectedIndex = this.selectedIndex;
  }
});

//var collegeId = null;

function processMaps(select_state) {
  var map = new mapboxgl.Map({
    container: select_state + "_map",
    style: "mapbox://styles/mapbox/light-v10",
    center: state_configs[select_state].center,
    zoom: state_configs[select_state].zoom,
  });

  if (select_state === "ma") {
    main_map = map;
  }
  var popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 10,
  });

  function hoverLayer(layer) {
    map.on("mouseenter", layer, function (e) {
      map.getCanvas().style.cursor = "pointer";
      /*
      if (collegeId) {
        map.removeFeatureState({
          source: "colleges",
          id: collegeId
        });
      }
      collegeId = e.features[0].properties.index;
      map.setFeatureState({
        source: 'colleges',
        id: collegeId,
      }, {
        hover: true
      });
      */

      const name =
        e.features[0].properties.NAME ||
        e.features[0].properties.FAC_NAME ||
        e.features[0].properties.COLLEGE;
      const city = e.features[0].properties.CITY + ', MA';
      const numStudents = e.features[0].properties.ENROLL.toLocaleString('en');
      const mcvpStatus = e.features[0].properties.MCVP === "Yes" ? "MCVP" : "Non-MCVP";
      const mcvpDot = mcvpStatus == "MCVP" ? "greenDot" : "dot";
      const header = (
        '<div class="popupHeader">' +
          '<h1 class="popupName">' + name + '</h1>' +
          '<p>' + 
            '<span class="popupCity">' + city + '</span><span class="dot"></span>' +
            '<span class="popupStudents"><strong>' + numStudents + '</strong> students</span><span class="' + mcvpDot + '"></span>' +
            '<span class="popupMcvpStatus">' + mcvpStatus + '</span>' +
          '</p>' +
        '</div>'
      );

      const partnering = (
        (e.features[0].properties.partner_name &&  e.features[0].properties.partner_name !== "null") ?
        "Partnering with <strong>" + e.features[0].properties.partner_name + "</strong>" :
        "<strong>Not partnered</strong> with a medical center"
      );
      const vaccination =  (
        e.features[0].properties.vaccination_site_no_support ?
        "<strong>Can serve</strong> as vaccination site" :
        "<strong>Not interested</strong> in serving as a vaccination site"
      );
      const employees_vaccinated = (
        e.features[0].properties.employees_vaccinated === "Yes" ?
        "All eligible employees vaccinated" :
        "Most employees not vaccinated"
      );
      const op_support =  (
        e.features[0].properties.vaccination_site_support === "Yes" ?
        '<p><span class="fas fa-cog"></span><span class="label"><strong>Can offer</strong> operational support</span></p>' : ""
      );

      const body = (
        '<div class="popupBody">' + 
          '<p><span class="fas fa-hospital"></span><span class="label">' + partnering + '</span></p>' +
          '<p><span class="fas fa-syringe"></span><span class="label">' + vaccination + '</span></p>' +
          op_support +
          '<p><span class="fas fa-users"></span><span class="label">' + employees_vaccinated + '</span></p>' +
        '</div>'
      );

      popup
        .setLngLat(e.features[0].geometry.coordinates)
        .setHTML(header + body)
        .addTo(map);
    });

    map.on("mouseleave", layer, function (e) {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });
  }

  map.on("load", function () {
    var geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      marker: {
        color: "orange",
      },
      mapboxgl: mapboxgl,
    });
    map.addControl(geocoder);
    map.addControl(new mapboxgl.NavigationControl());

    fetch(state_configs[select_state].colleges)
      .then(function (res) {
        return res.json();
      })
      .then(function (colleges) {
        colleges.features = colleges.features.filter(function (college) {
          if (select_state !== "ma") {
            return true;
          }
          if (
            ["Boston College", "Northeastern University"].includes(
              college.properties.COLLEGE
            )
          ) {
            return college.properties.CAMPUS === "Main Campus";
          }
          return true;
        });

        colleges.features.forEach(function (feature) {
          feature.properties.NAME =
            feature.properties.NAME || feature.properties.COLLEGE;
        });

        map.addSource("colleges", {
          type: "geojson",
          data: colleges,
        });

        map.addLayer({
          id: "colleges",
          type: "circle",
          source: "colleges",
          paint: {
            "circle-radius": ["*", ["sqrt", ["get", "ENROLL"]], 0.225],
            "circle-color": "#006b9c",
            "circle-opacity": 0.4,
            "circle-stroke-width": ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0],
            "circle-stroke-color": ['case', ['boolean', ['feature-state', 'hover'], false], 'red', 'black']
          },
        });
        hoverLayer("colleges");
        console.log("colleges:", colleges);
        console.log("map:", map);
      });
  });
}
processMaps("ma");
