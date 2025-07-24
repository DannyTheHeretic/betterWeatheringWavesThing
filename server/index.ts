import {
  AppSettings,
  DESKTHING_EVENTS,
  SETTING_TYPES,
} from "@deskthing/types";
import { createDeskThing } from "@deskthing/server";
import WeatherService from "./weather";
import { ToClientData, GenericTransitData, WeatherEvents } from "./types"

const DeskThing = createDeskThing<GenericTransitData, ToClientData>()


const start = async () => {
  await setupSettings();

};

DeskThing.on(WeatherEvents.GET, async (request) => {
  if (request.request === "weather_data") {
    console.debug("Getting weather data");
    const weatherData = await WeatherService.getWeather();
    if (weatherData) {
      DeskThing.send({ type: "weather_data", payload: weatherData });
    } else {
      console.debug("Error getting weather data");
    }
  }
});

// DeskThing.on(DESKTHING_EVENTS.SETTINGS, (settings) => {
//   // Syncs the data with the server
//   if (settings) {
//     console.debug("Settings updating");
//     WeatherService.updateData(settings.payload);
//   }
// });


const setupSettings = async () => {
  let latitude: number = 0, longitude: number = 0;
  
  try {

    const response = await fetch("http://ip-api.com/json/?fields=lat,lon");
    
    
    if (!response.ok) {
      throw new Error(response.statusText);
    } else {
      const { lat, lon } = await response.json();
      latitude = lat;
      longitude = lon;
      console.debug(`Latitude: ${latitude}, Longitude: ${longitude}`);
    }
  } catch (error) {
    console.warn("Error getting location: " + (error instanceof Error ? error.message : error));
  }

  // background: linear-gradient(90deg,rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%);
  const settings: AppSettings = {
      temp_unit: {
          label: "Temperature Unit",
          id: 'temp_unit',
          value: "f",
          type: SETTING_TYPES.SELECT,
          options: [
              { label: "Fahrenheit", value: "f" },
              { label: "Celsius", value: "c" },
          ],
      },
      speed_unit: {
          label: "Wind Speed Unit",
          id: 'speed_unit',
          value: "mph",
          placeholder: "mph",
          type: SETTING_TYPES.SELECT,
          options: [
              { label: "Miles Per Hour", value: "mph" },
              { label: "Kilometers Per Hour", value: "kmh" },
          ],
      },
      latitude: {
          label: "Latitude",
          id: 'latitude',
          value: latitude,
          description:
              "The latitude of the location you want to get weather data for. Can be found on google maps.",
          type: SETTING_TYPES.NUMBER,
          min: -180,
          max: 180,
      },
      longitude: {
          label: "Longitude",
          id: 'longitude',
          description:
              "The longitude of the location you want to get weather data for. Can be found on google maps.",
          value: longitude,
          type: SETTING_TYPES.NUMBER,
          min: -180,
          max: 180,
      },
      from: {
          id: 'from',
          label: "First Color",
          description: "Adjust the color using the color picker",
          type: SETTING_TYPES.COLOR,
          value: "black", // Will end up being a HEX code. This is just the default data
      },
      mid: {
          id: 'mid',
          label: "Middle Color",
          description: "Adjust the color using the color picker",
          type: SETTING_TYPES.COLOR,
          value: "black", // Will end up being a HEX code. This is just the default data
      },
      to: {
          id: 'to',
          label: "End Color",
          description: "Adjust the color using the color picker",
          type: SETTING_TYPES.COLOR,
          value: "black", // Will end up being a HEX code. This is just the default data
      },
      breathing: {
          id: 'breathing',
          label: "Breathing Gradient",
          description: "Whether or not to animate the background",
          type: SETTING_TYPES.BOOLEAN,
          value: false,
      },
      duration: {
          id: 'duration',
          label: "Third Dependant Setting",
          description: "Set Dependant Setting to any value but 'disabled' to enable this",
          type: SETTING_TYPES.NUMBER,
          value: 10,
          min: 0,
          max: 100,
      }
  };

  await DeskThing.initSettings(settings);
}

const stop = async () => {
  WeatherService.stop();
};
DeskThing.on(DESKTHING_EVENTS.STOP, stop);


// Main Entrypoint of the server
DeskThing.on(DESKTHING_EVENTS.START, start);
